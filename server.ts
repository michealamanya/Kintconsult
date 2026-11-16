import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { desc, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  auditLog,
  awardsContracts,
  capabilities,
  certifications,
  commodities,
  documents,
  events,
  feedbackLabels,
  mineralLicences,
  organisationCapabilities,
  organisations,
  tenderRequirements,
  tenders,
  timeSeries,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import { evaluateSupplierAgainstTender } from './src/services/scoring.ts';
import {
  extractTenderFromText,
  runGroundedResearchCopilot,
} from './src/services/modelGateway.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// Health check (does not touch DB)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kint-industrial-intelligence' });
});

// Authenticated user profile + workspace bootstrap
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    res.json({ user: req.dbUser });
  } catch (error: any) {
    console.error('Failed to load user workspace:', error);
    res.status(500).json({ error: error.message || 'Failed to load workspace' });
  }
});

// Analyst Workbench Overview
app.get('/api/overview', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [
      allOrgs,
      allTenders,
      allAwards,
      allEvents,
      allFeedback,
      recentAudit,
      allCerts,
    ] = await Promise.all([
      db.select().from(organisations),
      db.select().from(tenders).orderBy(tenders.deadline),
      db.select().from(awardsContracts).orderBy(desc(awardsContracts.awardDate)),
      db.select().from(events).orderBy(desc(events.createdAt)),
      db.select().from(feedbackLabels).orderBy(desc(feedbackLabels.createdAt)),
      db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8),
      db.select().from(certifications),
    ]);

    const suppliers = allOrgs.filter((o) => o.orgRole === 'supplier');
    const verifiedSuppliers = suppliers.filter(
      (o) => o.verificationStatus === 'Verified'
    );
    const openProposals = allEvents.filter((e) => e.status === 'open');
    const expiringCerts = allCerts.filter(
      (c) => c.status === 'Expiring Soon' || c.status === 'Expired'
    );

    const totalOpenTenderValueUsd = allTenders
      .filter((t) => t.status === 'Open')
      .reduce((sum, t) => sum + Number(t.estimatedValueUsd || 0), 0);

    res.json({
      kpis: {
        verifiedSuppliersCount: verifiedSuppliers.length,
        totalSuppliersCount: suppliers.length,
        openTendersCount: allTenders.filter((t) => t.status === 'Open').length,
        totalOpenTenderValueUsd,
        openProposalsCount: openProposals.length,
        expiringCertsCount: expiringCerts.length,
        feedbackLabelsCount: allFeedback.length,
        historicalAwardsCount: allAwards.length,
      },
      priorityTenders: allTenders.slice(0, 5),
      openEvents: openProposals.slice(0, 6),
      recentAwards: allAwards.slice(0, 4),
      recentAudit,
    });
  } catch (error: any) {
    console.error('Overview endpoint failed:', error);
    res.status(500).json({ error: error.message || 'Failed to load overview' });
  }
});

// Industrial Registry: List Organisations with Capabilities & Certifications
app.get('/api/organisations', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [orgs, orgCaps, caps, certs, awards] = await Promise.all([
      db.select().from(organisations).orderBy(organisations.legalName),
      db.select().from(organisationCapabilities),
      db.select().from(capabilities),
      db.select().from(certifications),
      db.select().from(awardsContracts),
    ]);

    const capMap = new Map(caps.map((c) => [c.id, c]));

    const enriched = orgs.map((org) => {
      const linkedCaps = orgCaps
        .filter((oc) => oc.organisationId === org.id)
        .map((oc) => {
          const cap = capMap.get(oc.capabilityId);
          return {
            ...oc,
            code: cap?.code || '',
            name: cap?.name || '',
            parentCategory: cap?.parentCategory || '',
          };
        });

      const orgCerts = certs.filter((c) => c.organisationId === org.id);
      const orgAwards = awards.filter((a) => a.winningOrganisationId === org.id);

      return {
        ...org,
        capabilities: linkedCaps,
        certifications: orgCerts,
        awards: orgAwards,
      };
    });

    const q = String(req.query.q || '').trim().toLowerCase();
    const sector = String(req.query.sector || '').trim();
    const tier = String(req.query.tier || '').trim();

    const filtered = enriched.filter((o) => {
      const matchesQ =
        !q ||
        o.legalName.toLowerCase().includes(q) ||
        o.subsector.toLowerCase().includes(q) ||
        o.district.toLowerCase().includes(q) ||
        (o.pauNsdNumber || '').toLowerCase().includes(q) ||
        o.capabilities.some((c) => c.name.toLowerCase().includes(q));
      const matchesSector = !sector || sector === 'All' || o.sector === sector;
      const matchesTier = !tier || tier === 'All' || o.confidenceTier === tier;
      return matchesQ && matchesSector && matchesTier;
    });

    res.json({ organisations: filtered, taxonomy: caps });
  } catch (error: any) {
    console.error('Organisations fetch failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch organisations' });
  }
});

// Create Canonical Organisation Record
app.post('/api/organisations', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const {
      legalName,
      sector,
      subsector,
      district,
      ownershipType,
      localContentPct,
      pauNsdNumber,
      pauNsdStatus,
      provenanceSource,
      provenanceUrl,
      confidenceTier,
    } = req.body;

    if (!legalName || !subsector || !district || !provenanceSource) {
      return res.status(400).json({
        error: 'legalName, subsector, district, and provenanceSource are required.',
      });
    }

    const [created] = await db
      .insert(organisations)
      .values({
        legalName: String(legalName).trim(),
        aliases: [],
        orgRole: 'supplier',
        sector: sector || 'Petroleum',
        subsector: String(subsector).trim(),
        district: String(district).trim(),
        country: 'Uganda',
        ownershipType: ownershipType || 'Ugandan Owned',
        localContentPct: Number(localContentPct ?? 100),
        pauNsdNumber: pauNsdNumber ? String(pauNsdNumber).trim() : null,
        pauNsdStatus: pauNsdStatus || 'Pending',
        confidenceTier: confidenceTier || 'B',
        provenanceSource: String(provenanceSource).trim(),
        provenanceUrl: provenanceUrl ? String(provenanceUrl).trim() : null,
        verificationStatus: 'Needs Review',
      })
      .returning();

    await db.insert(auditLog).values({
      actorUid: req.dbUser!.uid,
      actorEmail: req.dbUser!.email,
      actorType: 'user',
      action: 'CREATE_ORGANISATION_RECORD',
      resourceType: 'organisation',
      resourceId: String(created.id),
      inputsSummary: { legalName, sector, district, provenanceSource },
      outputsSummary: { verificationStatus: created.verificationStatus },
      sourceRefs: provenanceUrl ? [provenanceUrl] : [provenanceSource],
    });

    res.status(201).json({ organisation: created });
  } catch (error: any) {
    console.error('Create organisation failed:', error);
    res.status(500).json({ error: error.message || 'Failed to create organisation' });
  }
});

// Analyst Verification Action on Registry Record
app.post('/api/organisations/:id/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { verificationStatus, confidenceTier, notes } = req.body;

    if (!['Verified', 'Needs Review', 'Flagged'].includes(verificationStatus)) {
      return res.status(400).json({ error: 'Invalid verificationStatus' });
    }

    const [updated] = await db
      .update(organisations)
      .set({
        verificationStatus,
        confidenceTier: confidenceTier || undefined,
        verifiedBy: req.dbUser!.email,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organisations.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    await Promise.all([
      db.insert(feedbackLabels).values({
        userUid: req.dbUser!.uid,
        targetType: 'entity_verification',
        targetId: String(id),
        labelValue: verificationStatus === 'Verified' ? 'verified' : 'gap_flagged',
        notes: notes || `Analyst set status to ${verificationStatus}`,
      }),
      db.insert(auditLog).values({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorType: 'user',
        action: 'VERIFY_ORGANISATION',
        resourceType: 'organisation',
        resourceId: String(id),
        inputsSummary: { verificationStatus, confidenceTier, notes },
        outputsSummary: { legalName: updated.legalName, status: updated.verificationStatus },
        sourceRefs: updated.provenanceUrl ? [updated.provenanceUrl] : [updated.provenanceSource],
      }),
    ]);

    res.json({ organisation: updated });
  } catch (error: any) {
    console.error('Verify organisation failed:', error);
    res.status(500).json({ error: error.message || 'Failed to verify organisation' });
  }
});

// Tenders & Procurement Opportunities
app.get('/api/tenders', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [allTenders, allReqs] = await Promise.all([
      db.select().from(tenders).orderBy(tenders.deadline),
      db.select().from(tenderRequirements),
    ]);

    const enriched = allTenders.map((t) => ({
      ...t,
      requirements: allReqs.filter((r) => r.tenderId === t.id),
    }));

    res.json({ tenders: enriched });
  } catch (error: any) {
    console.error('Fetch tenders failed:', error);
    res.status(500).json({ error: error.message || 'Failed to load tenders' });
  }
});

// M07 + M09 Deterministic Supplier-Opportunity Matching Engine
app.get('/api/tenders/:id/match', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const tenderId = Number(req.params.id);

    const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId));
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const [reqs, orgs, orgCaps, caps, certs, awards] = await Promise.all([
      db.select().from(tenderRequirements).where(eq(tenderRequirements.tenderId, tenderId)),
      db.select().from(organisations),
      db.select().from(organisationCapabilities),
      db.select().from(capabilities),
      db.select().from(certifications),
      db.select().from(awardsContracts),
    ]);

    const capById = new Map(caps.map((c) => [c.id, c]));
    const suppliers = orgs.filter((o) => o.orgRole === 'supplier');

    const ranked = suppliers
      .map((org) => {
        const mappedCaps = orgCaps
          .filter((oc) => oc.organisationId === org.id)
          .map((oc) => {
            const c = capById.get(oc.capabilityId);
            return {
              code: c?.code || '',
              name: c?.name || '',
              verified: oc.verified,
            };
          });
        const orgCerts = certs.filter((c) => c.organisationId === org.id);
        const orgAwards = awards.filter((a) => a.winningOrganisationId === org.id);

        return evaluateSupplierAgainstTender(
          org,
          mappedCaps,
          orgCerts,
          orgAwards,
          tender,
          reqs
        );
      })
      .sort((a, b) => b.m07RankScore - a.m07RankScore);

    res.json({
      tender,
      requirements: reqs,
      matches: ranked,
    });
  } catch (error: any) {
    console.error('Supplier matching failed:', error);
    res.status(500).json({ error: error.message || 'Supplier matching failed' });
  }
});

// M03 Document Extraction (Preview only — requires human confirmation to save)
app.post('/api/tenders/extract', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || String(rawText).trim().length < 25) {
      return res.status(400).json({
        error: 'Please paste at least 25 characters of tender notice text for extraction.',
      });
    }

    const draft = await extractTenderFromText(String(rawText));

    await db.insert(auditLog).values({
      actorUid: req.dbUser!.uid,
      actorEmail: req.dbUser!.email,
      actorType: 'agent',
      agentId: 'A02',
      modelId: 'M03-gemini-4-hydrogen',
      action: 'EXTRACT_TENDER_DRAFT',
      resourceType: 'tender_draft',
      resourceId: draft.referenceCode,
      inputsSummary: { textLength: String(rawText).length },
      outputsSummary: {
        title: draft.title,
        requirementsCount: draft.requirements.length,
      },
      sourceRefs: ['Analyst Uploaded Notice'],
    });

    res.json({ draft });
  } catch (error: any) {
    console.error('Tender extraction failed:', error);
    res.status(500).json({ error: error.message || 'Tender extraction failed' });
  }
});

// Commit Human-Confirmed Tender & Requirements
app.post('/api/tenders', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const {
      referenceCode,
      title,
      buyerOrganisation,
      sector,
      category,
      location,
      deadline,
      estimatedValueUsd,
      summary,
      sourceName,
      requirements,
    } = req.body;

    if (!referenceCode || !title || !buyerOrganisation || !deadline) {
      return res.status(400).json({ error: 'Missing required tender fields.' });
    }

    const [createdTender] = await db
      .insert(tenders)
      .values({
        referenceCode: String(referenceCode).trim(),
        title: String(title).trim(),
        buyerOrganisation: String(buyerOrganisation).trim(),
        sector: sector || 'Petroleum',
        category: category || 'Logistics & Transport',
        location: location || 'Hoima / Albertine Basin',
        deadline: String(deadline).trim(),
        estimatedValueUsd: Number(estimatedValueUsd || 1000000),
        status: 'Open',
        summary: summary || '',
        sourceName: sourceName || 'Analyst Verified Notice',
        confidenceTier: 'B',
      })
      .returning();

    if (Array.isArray(requirements) && requirements.length > 0) {
      await db.insert(tenderRequirements).values(
        requirements.map((r: any) => ({
          tenderId: createdTender.id,
          requirementType: r.requirementType === 'scored' ? 'scored' : 'mandatory',
          category: r.category || 'certification',
          title: r.title,
          description: r.description || '',
          requiredCertType: r.requiredCertType || null,
          requiredCapabilityCode: r.requiredCapabilityCode || null,
          minLocalContentPct: r.minLocalContentPct ? Number(r.minLocalContentPct) : null,
          weight: Number(r.weight || 25),
        }))
      );
    }

    await db.insert(auditLog).values({
      actorUid: req.dbUser!.uid,
      actorEmail: req.dbUser!.email,
      actorType: 'user',
      action: 'COMMIT_EXTRACTED_TENDER',
      resourceType: 'tender',
      resourceId: String(createdTender.id),
      inputsSummary: { referenceCode, title },
      outputsSummary: { requirementsInserted: Array.isArray(requirements) ? requirements.length : 0 },
      sourceRefs: [sourceName || 'Analyst Verified Notice'],
    });

    res.status(201).json({ tender: createdTender });
  } catch (error: any) {
    console.error('Create tender failed:', error);
    res.status(500).json({ error: error.message || 'Failed to save tender' });
  }
});

// M05 / A01 Grounded AI Research Copilot
app.post('/api/copilot/query', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const { question } = req.body;
    if (!question || String(question).trim().length < 5) {
      return res.status(400).json({ error: 'Please enter a specific research question.' });
    }

    const [
      orgs,
      orgCaps,
      caps,
      certs,
      allTenders,
      allReqs,
      allAwards,
      allDocs,
      allCommodities,
      allSeries,
    ] = await Promise.all([
      db.select().from(organisations),
      db.select().from(organisationCapabilities),
      db.select().from(capabilities),
      db.select().from(certifications),
      db.select().from(tenders),
      db.select().from(tenderRequirements),
      db.select().from(awardsContracts),
      db.select().from(documents),
      db.select().from(commodities),
      db.select().from(timeSeries),
    ]);

    const capById = new Map(caps.map((c) => [c.id, c]));

    const context = {
      organisations: orgs.map((o) => ({
        id: o.id,
        legalName: o.legalName,
        sector: o.sector,
        subsector: o.subsector,
        district: o.district,
        localContentPct: o.localContentPct,
        pauNsdNumber: o.pauNsdNumber,
        pauNsdStatus: o.pauNsdStatus,
        confidenceTier: o.confidenceTier,
        verificationStatus: o.verificationStatus,
        provenanceSource: o.provenanceSource,
        capabilities: orgCaps
          .filter((oc) => oc.organisationId === o.id)
          .map((oc) => capById.get(oc.capabilityId)?.name || '')
          .filter(Boolean),
        certifications: certs
          .filter((c) => c.organisationId === o.id)
          .map((c) => ({ certType: c.certType, status: c.status, validTo: c.validTo })),
      })),
      tenders: allTenders.map((t) => ({
        id: t.id,
        referenceCode: t.referenceCode,
        title: t.title,
        buyerOrganisation: t.buyerOrganisation,
        category: t.category,
        deadline: t.deadline,
        estimatedValueUsd: t.estimatedValueUsd,
        requirements: allReqs
          .filter((r) => r.tenderId === t.id)
          .map((r) => ({ title: r.title, requirementType: r.requirementType })),
      })),
      awards: allAwards.map((a) => ({
        id: a.id,
        tenderReference: a.tenderReference,
        title: a.title,
        winningProviderName: a.winningProviderName,
        category: a.category,
        contractValueUsd: a.contractValueUsd,
        awardDate: a.awardDate,
      })),
      documents: allDocs.map((d) => ({
        id: d.id,
        code: d.code,
        title: d.title,
        sourceName: d.sourceName,
        confidenceTier: d.confidenceTier,
        contentText: d.contentText,
      })),
      commodityTrends: allCommodities.map((c) => {
        const rows = allSeries
          .filter((s) => s.commodityId === c.id)
          .sort((a, b) => a.periodDate.localeCompare(b.periodDate));
        const actuals = rows.filter((r) => r.seriesType === 'actual');
        const forecasts = rows.filter((r) => r.seriesType === 'forecast');
        const lastActual = actuals[actuals.length - 1];
        const lastForecast = forecasts[forecasts.length - 1];
        return {
          code: c.code,
          name: c.name,
          unit: c.unit,
          importSubstitutionGapScore: c.importSubstitutionGapScore,
          latestActual: lastActual
            ? { periodDate: lastActual.periodDate, value: lastActual.value }
            : undefined,
          latestForecast: lastForecast
            ? {
                periodDate: lastForecast.periodDate,
                value: lastForecast.value,
                lowerBound: lastForecast.lowerBound,
                upperBound: lastForecast.upperBound,
              }
            : undefined,
        };
      }),
    };

    const result = await runGroundedResearchCopilot(String(question), context);

    const [auditEntry] = await db
      .insert(auditLog)
      .values({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorType: 'agent',
        agentId: 'A01',
        modelId: result.modelId,
        action: 'RESEARCH_COPILOT_QUERY',
        resourceType: 'copilot_brief',
        resourceId: `brief-${Date.now()}`,
        inputsSummary: { question: String(question).slice(0, 240) },
        outputsSummary: {
          abstained: result.abstained,
          citationCount: result.citations.length,
          latencyMs: result.latencyMs,
        },
        sourceRefs: result.citations.map((c) => c.refId),
      })
      .returning();

    res.json({ result, auditId: auditEntry.id });
  } catch (error: any) {
    console.error('Research copilot query failed:', error);
    res.status(500).json({ error: error.message || 'Research Copilot query failed' });
  }
});

// Governance, Human-in-the-Loop Approvals & Audit Trail
app.get('/api/governance/proposals', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [allEvents, allAudit, allFeedback] = await Promise.all([
      db.select().from(events).orderBy(desc(events.createdAt)),
      db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(30),
      db.select().from(feedbackLabels).orderBy(desc(feedbackLabels.createdAt)).limit(20),
    ]);

    res.json({
      events: allEvents,
      auditLog: allAudit,
      feedbackLabels: allFeedback,
    });
  } catch (error: any) {
    console.error('Governance fetch failed:', error);
    res.status(500).json({ error: error.message || 'Failed to load governance queue' });
  }
});

// Decide on Agent Proposal / Anomaly
app.post('/api/governance/proposals/:id/decide', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { decision, notes } = req.body;

    if (!['approved', 'rejected', 'resolved'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const [existing] = await db.select().from(events).where(eq(events.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Proposal or event not found' });
    }

    const [updatedEvent] = await db
      .update(events)
      .set({
        status: decision,
        resolvedBy: req.dbUser!.email,
        resolvedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    // If an A08 Data Steward confidence-tier proposal is approved, apply to canonical organisation
    if (
      decision === 'approved' &&
      existing.entityType === 'organisation' &&
      existing.entityId &&
      existing.agentId === 'A08' &&
      existing.payloadJson?.proposedConfidenceTier
    ) {
      await db
        .update(organisations)
        .set({
          confidenceTier: String(existing.payloadJson.proposedConfidenceTier),
          verificationStatus: String(
            existing.payloadJson.proposedVerificationStatus || 'Verified'
          ),
          verifiedBy: req.dbUser!.email,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organisations.id, existing.entityId));
    }

    if (
      decision === 'approved' &&
      existing.entityType === 'organisation' &&
      existing.entityId &&
      existing.modelId === 'M24'
    ) {
      await db
        .update(organisations)
        .set({
          verificationStatus: 'Flagged',
          updatedAt: new Date(),
        })
        .where(eq(organisations.id, existing.entityId));
    }

    await db.insert(auditLog).values({
      actorUid: req.dbUser!.uid,
      actorEmail: req.dbUser!.email,
      actorType: 'user',
      agentId: existing.agentId,
      modelId: existing.modelId,
      action: `HUMAN_DECISION_${decision.toUpperCase()}`,
      resourceType: 'event_proposal',
      resourceId: String(id),
      inputsSummary: { title: existing.title, notes: notes || '' },
      outputsSummary: { status: decision },
      sourceRefs: [existing.entityType ? `${existing.entityType}:${existing.entityId}` : 'system'],
    });

    res.json({ event: updatedEvent });
  } catch (error: any) {
    console.error('Decision update failed:', error);
    res.status(500).json({ error: error.message || 'Failed to record decision' });
  }
});

// Deterministic M24 Data Quality & Anomaly Scan
app.post('/api/governance/run-steward', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [orgs, certs, existingEvents] = await Promise.all([
      db.select().from(organisations),
      db.select().from(certifications),
      db.select().from(events),
    ]);

    const newFindings: Array<{
      eventType: string;
      severity: string;
      title: string;
      description: string;
      entityType: string;
      entityId: number;
      agentId: string;
      modelId: string;
      payloadJson: Record<string, unknown>;
    }> = [];

    for (const org of orgs) {
      if (org.orgRole === 'supplier' && !org.provenanceUrl) {
        const alreadyOpen = existingEvents.some(
          (e) => e.entityId === org.id && e.title.includes('Missing Source URL') && e.status === 'open'
        );
        if (!alreadyOpen) {
          newFindings.push({
            eventType: 'anomaly_m24',
            severity: 'warning',
            title: `Missing Source URL on ${org.legalName}`,
            description: 'Provenance URL is null; M24 Data Quality requires verifiable external reference.',
            entityType: 'organisation',
            entityId: org.id,
            agentId: 'A08',
            modelId: 'M24',
            payloadJson: { field: 'provenanceUrl' },
          });
        }
      }

      const orgCerts = certs.filter((c) => c.organisationId === org.id);
      if (org.orgRole === 'supplier' && orgCerts.length === 0) {
        const alreadyOpen = existingEvents.some(
          (e) => e.entityId === org.id && e.title.includes('Zero Certifications') && e.status === 'open'
        );
        if (!alreadyOpen) {
          newFindings.push({
            eventType: 'anomaly_m24',
            severity: 'info',
            title: `Zero Certifications Linked to ${org.legalName}`,
            description: 'Supplier has no ISO/NEMA/ASME certifications logged in KINT vault.',
            entityType: 'organisation',
            entityId: org.id,
            agentId: 'A08',
            modelId: 'M24',
            payloadJson: { count: 0 },
          });
        }
      }
    }

    if (newFindings.length > 0) {
      await db.insert(events).values(newFindings);
    }

    await db.insert(auditLog).values({
      actorUid: req.dbUser!.uid,
      actorEmail: req.dbUser!.email,
      actorType: 'agent',
      agentId: 'A08',
      modelId: 'M24',
      action: 'RUN_DATA_QUALITY_SCAN',
      resourceType: 'registry',
      resourceId: 'all',
      inputsSummary: { organisationsScanned: orgs.length, certsScanned: certs.length },
      outputsSummary: { newAnomaliesCreated: newFindings.length },
      sourceRefs: ['Internal Canonical Registry'],
    });

    res.json({ newAnomaliesCreated: newFindings.length });
  } catch (error: any) {
    console.error('Data steward scan failed:', error);
    res.status(500).json({ error: error.message || 'Failed to run steward scan' });
  }
});

// Compounding Feedback Label Submission
app.post('/api/feedback', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetType, targetId, contextId, labelValue, notes } = req.body;
    if (!targetType || !targetId || !labelValue) {
      return res.status(400).json({ error: 'targetType, targetId, and labelValue are required' });
    }

    const [created] = await db
      .insert(feedbackLabels)
      .values({
        userUid: req.dbUser!.uid,
        targetType,
        targetId: String(targetId),
        contextId: contextId ? String(contextId) : null,
        labelValue,
        notes: notes || null,
      })
      .returning();

    await db.insert(auditLog).values({
      actorUid: req.dbUser!.uid,
      actorEmail: req.dbUser!.email,
      actorType: 'user',
      action: 'SUBMIT_FEEDBACK_LABEL',
      resourceType: targetType,
      resourceId: String(targetId),
      inputsSummary: { labelValue, contextId, notes },
      outputsSummary: { feedbackId: created.id },
      sourceRefs: ['Analyst Feedback Loop'],
    });

    res.status(201).json({ feedback: created });
  } catch (error: any) {
    console.error('Feedback submission failed:', error);
    res.status(500).json({ error: error.message || 'Failed to record feedback' });
  }
});

// Market, Trade & Expansion Modules (Energy & Minerals)
app.get('/api/market/intelligence', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await ensureSeeded();

    const [allCommodities, allSeries, allDocs, allLicences] = await Promise.all([
      db.select().from(commodities),
      db.select().from(timeSeries),
      db.select().from(documents),
      db.select().from(mineralLicences),
    ]);

    const enrichedCommodities = allCommodities.map((c) => ({
      ...c,
      series: allSeries
        .filter((s) => s.commodityId === c.id)
        .sort((a, b) => a.periodDate.localeCompare(b.periodDate)),
    }));

    res.json({
      commodities: enrichedCommodities,
      documents: allDocs,
      mineralLicences: allLicences,
    });
  } catch (error: any) {
    console.error('Market intelligence fetch failed:', error);
    res.status(500).json({ error: error.message || 'Failed to load market intelligence' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KINT Platform listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
