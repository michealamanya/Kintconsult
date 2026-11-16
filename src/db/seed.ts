import { count } from 'drizzle-orm';
import { db } from './index.ts';
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
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const [{ total }] = await db.select({ total: count() }).from(organisations);
      if (Number(total) > 0) {
        return;
      }

      // 1. Capabilities Taxonomy
      const insertedCaps = await db
        .insert(capabilities)
        .values([
          {
            code: 'CAP-LOG-HVY',
            name: 'Heavy Haulage & Rig Logistics',
            sector: 'Petroleum',
            parentCategory: 'Logistics & Transport',
            description: 'Abnormal load transport, craneage, pipe stringing, and oilfield rig mobilization.',
          },
          {
            code: 'CAP-WLD-FAB',
            name: 'ASME Steel Fabrication & Piping',
            sector: 'Petroleum',
            parentCategory: 'Engineering & Fabrication',
            description: 'Structural steel, pressure piping, spool fabrication, and NDT welding.',
          },
          {
            code: 'CAP-HSE-ENV',
            name: 'Environmental & Waste Management',
            sector: 'Petroleum',
            parentCategory: 'HSE & Compliance',
            description: 'Drilling waste treatment, NEMA EIA audits, spill response, and hazmat handling.',
          },
          {
            code: 'CAP-CIV-EWC',
            name: 'Civil Works, Wellpads & Access Roads',
            sector: 'Petroleum',
            parentCategory: 'Civil & Infrastructure',
            description: 'Wellpad earthworks, compacted marram access roads, drainage, and camp foundations.',
          },
          {
            code: 'CAP-PWR-MNT',
            name: 'Electrical, Instrumentation & Grid Tie-In',
            sector: 'Energy',
            parentCategory: 'Power & Instrumentation',
            description: 'Substation maintenance, switchgear, SCADA instrumentation, and solar-hybrid microgrids.',
          },
          {
            code: 'CAP-GEO-LAB',
            name: 'Geotechnical & Assay Testing Services',
            sector: 'Minerals',
            parentCategory: 'Geoscience & Labs',
            description: 'Core logging, soil mechanics testing, borehole telemetry, and mineral assay preparation.',
          },
        ])
        .returning();

      const capByCode = new Map(insertedCaps.map((c) => [c.code, c.id]));

      // 2. Canonical Organisations (Uganda Petroleum Ecosystem + Buyers)
      const insertedOrgs = await db
        .insert(organisations)
        .values([
          {
            legalName: 'Albertine Heavy Logistics Ltd',
            aliases: ['Albertine Hauliers', 'AHL Uganda'],
            orgRole: 'supplier',
            sector: 'Petroleum',
            subsector: 'Oilfield Logistics & Craneage',
            district: 'Hoima',
            country: 'Uganda',
            ownershipType: 'Ugandan Owned',
            localContentPct: 100,
            pauNsdNumber: 'PAU-NSD-2026-0142',
            pauNsdStatus: 'Active',
            website: 'https://albertinelogistics.ug.example',
            confidenceTier: 'A',
            provenanceSource: 'PAU National Supplier Database (NSD)',
            provenanceUrl: 'https://nsd.pau.go.ug/',
            verificationStatus: 'Verified',
            verifiedBy: 'KINT Domain Steward',
            verifiedAt: new Date('2026-10-18T10:00:00Z'),
          },
          {
            legalName: 'Nile Basin Fabrication & Piping SMC',
            aliases: ['Nile Basin Engineering', 'NBF Uganda'],
            orgRole: 'supplier',
            sector: 'Petroleum',
            subsector: 'Mechanical Fabrication & NDT',
            district: 'Jinja',
            country: 'Uganda',
            ownershipType: 'Ugandan Owned',
            localContentPct: 100,
            pauNsdNumber: 'PAU-NSD-2026-0289',
            pauNsdStatus: 'Active',
            website: 'https://nilefab.ug.example',
            confidenceTier: 'A',
            provenanceSource: 'PAU National Supplier Database (NSD)',
            provenanceUrl: 'https://nsd.pau.go.ug/',
            verificationStatus: 'Verified',
            verifiedBy: 'KINT Domain Steward',
            verifiedAt: new Date('2026-10-22T14:30:00Z'),
          },
          {
            legalName: 'Rwenzori Environmental & Waste Solutions Ltd',
            aliases: ['REWS Ltd'],
            orgRole: 'supplier',
            sector: 'Petroleum',
            subsector: 'Drilling Waste & NEMA Compliance',
            district: 'Buliisa',
            country: 'Uganda',
            ownershipType: 'Joint Venture',
            localContentPct: 68,
            pauNsdNumber: 'PAU-NSD-2026-0411',
            pauNsdStatus: 'Active',
            website: 'https://rwenzori-env.ug.example',
            confidenceTier: 'A',
            provenanceSource: 'PAU National Supplier Database (NSD)',
            provenanceUrl: 'https://nsd.pau.go.ug/',
            verificationStatus: 'Verified',
            verifiedBy: 'KINT Domain Steward',
            verifiedAt: new Date('2026-10-25T09:15:00Z'),
          },
          {
            legalName: 'Kampala Equatorial Civil Contractors Ltd',
            aliases: ['KECC Ltd', 'Equatorial Civils'],
            orgRole: 'supplier',
            sector: 'Petroleum',
            subsector: 'Wellpad Earthworks & Infrastructure',
            district: 'Kampala',
            country: 'Uganda',
            ownershipType: 'Ugandan Owned',
            localContentPct: 100,
            pauNsdNumber: 'PAU-NSD-2025-0933',
            pauNsdStatus: 'Pending',
            website: 'https://kecc.ug.example',
            confidenceTier: 'B',
            provenanceSource: 'PPDA Government Procurement Portal',
            provenanceUrl: 'https://gpp.ppda.go.ug/',
            verificationStatus: 'Needs Review',
          },
          {
            legalName: 'Victoria Grid & Instrumentation Services Ltd',
            aliases: ['VGIS Energy'],
            orgRole: 'supplier',
            sector: 'Energy',
            subsector: 'Electrical & SCADA Systems',
            district: 'Wakiso',
            country: 'Uganda',
            ownershipType: 'Ugandan Owned',
            localContentPct: 85,
            pauNsdNumber: 'PAU-NSD-2026-0518',
            pauNsdStatus: 'Active',
            website: 'https://vgis-energy.ug.example',
            confidenceTier: 'B',
            provenanceSource: 'Company Operator Disclosure & PPDA',
            provenanceUrl: 'https://gpp.ppda.go.ug/',
            verificationStatus: 'Verified',
            verifiedBy: 'KINT Domain Steward',
            verifiedAt: new Date('2026-10-29T11:00:00Z'),
          },
          {
            legalName: 'Bunyoro Oilfield Logistics & Fleet Co.',
            aliases: ['Bunyoro Fleet', 'BOLF'],
            orgRole: 'supplier',
            sector: 'Petroleum',
            subsector: 'Last-Mile Oilfield Haulage',
            district: 'Hoima',
            country: 'Uganda',
            ownershipType: 'Ugandan Owned',
            localContentPct: 100,
            pauNsdNumber: 'PAU-NSD-2026-0604',
            pauNsdStatus: 'Active',
            website: 'https://bunyorofleet.ug.example',
            confidenceTier: 'C',
            provenanceSource: 'Regional Chamber Directory Signal',
            provenanceUrl: 'https://nsd.pau.go.ug/',
            verificationStatus: 'Needs Review',
          },
          {
            legalName: 'Uganda National Oil Company (UNOC)',
            aliases: ['UNOC'],
            orgRole: 'operator',
            sector: 'Petroleum',
            subsector: 'National Oil Company & Upstream Joint Venture',
            district: 'Kampala',
            country: 'Uganda',
            ownershipType: 'State Enterprise',
            localContentPct: 100,
            pauNsdNumber: 'N/A',
            pauNsdStatus: 'N/A',
            website: 'https://www.unoc.co.ug/',
            confidenceTier: 'A',
            provenanceSource: 'UNOC Official Portal',
            provenanceUrl: 'https://www.unoc.co.ug/tenders-supply-opportunities/',
            verificationStatus: 'Verified',
            verifiedBy: 'System Baseline',
            verifiedAt: new Date('2026-10-01T08:00:00Z'),
          },
        ])
        .returning();

      const orgByName = new Map(insertedOrgs.map((o) => [o.legalName, o.id]));

      // 3. Organisation Capabilities
      await db.insert(organisationCapabilities).values([
        {
          organisationId: orgByName.get('Albertine Heavy Logistics Ltd')!,
          capabilityId: capByCode.get('CAP-LOG-HVY')!,
          evidenceSummary: 'Operates 24 low-bed trailers (up to 110T) and 3 mobile all-terrain cranes based in Hoima Industrial Park.',
          equipmentNotes: '24x MAN TGS 8x4 Heavy Prime Movers, 3x Liebherr 100T cranes',
          capacityMetric: '110T max single-piece axle payload',
          confidenceTier: 'A',
          verified: true,
        },
        {
          organisationId: orgByName.get('Albertine Heavy Logistics Ltd')!,
          capabilityId: capByCode.get('CAP-CIV-EWC')!,
          evidenceSummary: 'Laydown yard grading and heavy pad preparation supporting rig staging.',
          equipmentNotes: '4x CAT D6 dozers, 6x 25T tipper trucks',
          capacityMetric: '12,000 m² surfaced laydown capacity',
          confidenceTier: 'B',
          verified: true,
        },
        {
          organisationId: orgByName.get('Nile Basin Fabrication & Piping SMC')!,
          capabilityId: capByCode.get('CAP-WLD-FAB')!,
          evidenceSummary: 'ASME IX certified shop in Jinja producing carbon steel pipe spools, mud tanks, and structural skids.',
          equipmentNotes: '18x TIG/SMAW stations, ultrasonic NDT inspection unit',
          capacityMetric: '420 metric tons/month structural output',
          confidenceTier: 'A',
          verified: true,
        },
        {
          organisationId: orgByName.get('Rwenzori Environmental & Waste Solutions Ltd')!,
          capabilityId: capByCode.get('CAP-HSE-ENV')!,
          evidenceSummary: 'NEMA-licensed hazardous drilling cuttings treatment facility in Buliisa.',
          equipmentNotes: 'Thermal desorption unit (15T/hr), lined containment cells',
          capacityMetric: '3,600 tons/month drilling waste capacity',
          confidenceTier: 'A',
          verified: true,
        },
        {
          organisationId: orgByName.get('Kampala Equatorial Civil Contractors Ltd')!,
          capabilityId: capByCode.get('CAP-CIV-EWC')!,
          evidenceSummary: 'Completed 18km of upgraded feeder access roads in Kikuube District.',
          equipmentNotes: 'Motor graders, vibratory rollers, 2x excavators',
          capacityMetric: 'Up to 25km rural road upgrades/year',
          confidenceTier: 'B',
          verified: true,
        },
        {
          organisationId: orgByName.get('Victoria Grid & Instrumentation Services Ltd')!,
          capabilityId: capByCode.get('CAP-PWR-MNT')!,
          evidenceSummary: '33kV substation commissioning and industrial telemetry calibration across Central & Western Uganda.',
          equipmentNotes: 'Omicron relay test sets, thermal imaging gear',
          capacityMetric: '12 certified HV/SCADA field engineers',
          confidenceTier: 'B',
          verified: true,
        },
        {
          organisationId: orgByName.get('Bunyoro Oilfield Logistics & Fleet Co.')!,
          capabilityId: capByCode.get('CAP-LOG-HVY')!,
          evidenceSummary: 'Regional flatbed and cargo fleet operating between Kampala and Hoima.',
          equipmentNotes: '10x 40T flatbed trucks (unverified craneage)',
          capacityMetric: '40T standard flatbed limit',
          confidenceTier: 'C',
          verified: false,
        },
      ]);

      // 4. Certifications
      await db.insert(certifications).values([
        {
          organisationId: orgByName.get('Albertine Heavy Logistics Ltd')!,
          certType: 'ISO 45001',
          issuer: 'Bureau Veritas',
          referenceNumber: 'BV-UG-45001-8812',
          status: 'Valid',
          validFrom: '2025-03-01',
          validTo: '2028-02-28',
          scope: 'Heavy oilfield transport and lifting operations',
          provenanceSource: 'PAU NSD Document Vault',
        },
        {
          organisationId: orgByName.get('Albertine Heavy Logistics Ltd')!,
          certType: 'ISO 9001',
          issuer: 'SGS Uganda',
          referenceNumber: 'SGS-9001-2025-441',
          status: 'Valid',
          validFrom: '2025-01-15',
          validTo: '2028-01-14',
          scope: 'Quality management for fleet logistics',
          provenanceSource: 'PAU NSD Document Vault',
        },
        {
          organisationId: orgByName.get('Nile Basin Fabrication & Piping SMC')!,
          certType: 'ISO 9001',
          issuer: 'TUV Rheinland',
          referenceNumber: 'TUV-9001-77310',
          status: 'Valid',
          validFrom: '2024-11-01',
          validTo: '2027-10-31',
          scope: 'Pressure vessel and structural steel fabrication',
          provenanceSource: 'PAU NSD Document Vault',
        },
        {
          organisationId: orgByName.get('Nile Basin Fabrication & Piping SMC')!,
          certType: 'ASME IX Welding',
          issuer: 'ASME International',
          referenceNumber: 'ASME-UG-2025-19',
          status: 'Expiring Soon',
          validFrom: '2024-12-01',
          validTo: '2026-12-15',
          scope: 'Carbon and stainless pipe welding procedures',
          provenanceSource: 'Company Operator Disclosure',
        },
        {
          organisationId: orgByName.get('Rwenzori Environmental & Waste Solutions Ltd')!,
          certType: 'NEMA Waste Licence',
          issuer: 'NEMA Uganda',
          referenceNumber: 'NEMA-HWM-2026-077',
          status: 'Valid',
          validFrom: '2026-01-10',
          validTo: '2027-12-31',
          scope: 'Treatment and disposal of oilfield drilling cuttings',
          provenanceSource: 'NEMA Public Register',
        },
        {
          organisationId: orgByName.get('Rwenzori Environmental & Waste Solutions Ltd')!,
          certType: 'ISO 45001',
          issuer: 'SGS Uganda',
          referenceNumber: 'SGS-45001-2024-909',
          status: 'Valid',
          validFrom: '2024-06-01',
          validTo: '2027-05-31',
          scope: 'Hazardous waste management & spill containment',
          provenanceSource: 'PAU NSD Document Vault',
        },
        {
          organisationId: orgByName.get('Kampala Equatorial Civil Contractors Ltd')!,
          certType: 'ISO 9001',
          issuer: 'UNBS / QMS',
          referenceNumber: 'UNBS-QMS-2023-312',
          status: 'Expired',
          validFrom: '2023-09-01',
          validTo: '2026-08-31',
          scope: 'Civil engineering & road construction',
          provenanceSource: 'PPDA Provider Profile',
        },
        {
          organisationId: orgByName.get('Victoria Grid & Instrumentation Services Ltd')!,
          certType: 'ISO 45001',
          issuer: 'Bureau Veritas',
          referenceNumber: 'BV-UG-45001-9104',
          status: 'Valid',
          validFrom: '2025-07-01',
          validTo: '2028-06-30',
          scope: 'High-voltage electrical installation & SCADA',
          provenanceSource: 'Company Operator Disclosure',
        },
        {
          organisationId: orgByName.get('Bunyoro Oilfield Logistics & Fleet Co.')!,
          certType: 'ISO 9001',
          issuer: 'Local ISO Registry',
          referenceNumber: 'LIR-9001-2025-018',
          status: 'Valid',
          validFrom: '2025-05-01',
          validTo: '2028-04-30',
          scope: 'General cargo transport',
          provenanceSource: 'Unverified Company Submission',
        },
      ]);

      // 5. Active Procurement Tenders
      const insertedTenders = await db
        .insert(tenders)
        .values([
          {
            referenceCode: 'UNOC-TEN-2026-041',
            title: 'Kingfisher–Hoima Heavy Equipment Haulage & Pipe Stringing',
            buyerOrganisation: 'Uganda National Oil Company (UNOC)',
            sector: 'Petroleum',
            category: 'Logistics & Transport',
            location: 'Hoima / Kikuube Basin',
            deadline: '2026-12-18',
            estimatedValueUsd: 4850000,
            status: 'Open',
            summary:
              'Provision of abnormal-load transport, 100T mobile craneage, and line-pipe stringing across Albertine Basin feeder corridors under PAU local-content ring-fencing rules.',
            sourceName: 'UNOC Tenders & Supply',
            sourceUrl: 'https://www.unoc.co.ug/tenders-supply-opportunities/',
            confidenceTier: 'A',
          },
          {
            referenceCode: 'PPDA-EPC-2026-118',
            title: 'Central Processing Facility Structural Pipe Spools & Skids',
            buyerOrganisation: 'Tilenga Upstream EPC Consortium',
            sector: 'Petroleum',
            category: 'Engineering & Fabrication',
            location: 'Buliisa / Jinja Fabrication Yard',
            deadline: '2026-12-29',
            estimatedValueUsd: 3200000,
            status: 'Open',
            summary:
              'Fabrication, NDT testing, and protective coating of carbon-steel structural pipe spools and pump skids meeting ASME IX standards.',
            sourceName: 'PPDA Government Procurement Portal',
            sourceUrl: 'https://gpp.ppda.go.ug/',
            confidenceTier: 'A',
          },
          {
            referenceCode: 'PAU-HSE-2026-019',
            title: 'Drilling Cuttings Thermal Treatment & Hazmat Logistics',
            buyerOrganisation: 'CNOOC / Kingfisher Development JV',
            sector: 'Petroleum',
            category: 'HSE & Compliance',
            location: 'Buhuka / Kikuube',
            deadline: '2027-01-12',
            estimatedValueUsd: 2650000,
            status: 'Open',
            summary:
              'Collection, manifest tracking, and NEMA-compliant thermal treatment of oil-based mud drilling cuttings and associated industrial waste.',
            sourceName: 'PAU Procurement Notice',
            sourceUrl: 'https://nsd.pau.go.ug/',
            confidenceTier: 'A',
          },
        ])
        .returning();

      const tenderByRef = new Map(insertedTenders.map((t) => [t.referenceCode, t.id]));

      // 6. Tender Requirements (Mandatory + Scored)
      await db.insert(tenderRequirements).values([
        // Tender 1: Heavy Haulage
        {
          tenderId: tenderByRef.get('UNOC-TEN-2026-041')!,
          requirementType: 'mandatory',
          category: 'registration',
          title: 'Active PAU National Supplier Database (NSD) Registration',
          description: 'Supplier must hold an active 2026 PAU NSD registration number.',
          requiredCertType: null,
          requiredCapabilityCode: null,
          minLocalContentPct: null,
          weight: 30,
        },
        {
          tenderId: tenderByRef.get('UNOC-TEN-2026-041')!,
          requirementType: 'mandatory',
          category: 'certification',
          title: 'Valid ISO 45001 Occupational Health & Safety Certification',
          description: 'Must hold unexpired ISO 45001 certificate covering heavy transport or lifting.',
          requiredCertType: 'ISO 45001',
          requiredCapabilityCode: null,
          minLocalContentPct: null,
          weight: 25,
        },
        {
          tenderId: tenderByRef.get('UNOC-TEN-2026-041')!,
          requirementType: 'mandatory',
          category: 'local_content',
          title: 'Ring-Fenced Ugandan Equity >= 51%',
          description: 'Transportation and logistics is ring-fenced for majority Ugandan-owned companies under Petroleum Regulations.',
          requiredCertType: null,
          requiredCapabilityCode: null,
          minLocalContentPct: 51,
          weight: 25,
        },
        {
          tenderId: tenderByRef.get('UNOC-TEN-2026-041')!,
          requirementType: 'scored',
          category: 'capability',
          title: 'Heavy Haulage & Rig Logistics Fleet Capacity',
          description: 'Demonstrated prime mover and mobile crane fleet matching abnormal-load oilfield requirements.',
          requiredCertType: null,
          requiredCapabilityCode: 'CAP-LOG-HVY',
          minLocalContentPct: null,
          weight: 20,
        },
        // Tender 2: Fabrication
        {
          tenderId: tenderByRef.get('PPDA-EPC-2026-118')!,
          requirementType: 'mandatory',
          category: 'certification',
          title: 'Valid ISO 9001 Quality Management System',
          description: 'Active ISO 9001 certification for industrial fabrication.',
          requiredCertType: 'ISO 9001',
          requiredCapabilityCode: null,
          minLocalContentPct: null,
          weight: 30,
        },
        {
          tenderId: tenderByRef.get('PPDA-EPC-2026-118')!,
          requirementType: 'mandatory',
          category: 'certification',
          title: 'Valid ASME IX Welding Procedure Qualification',
          description: 'Current ASME IX welding qualification for carbon-steel pressure piping.',
          requiredCertType: 'ASME IX Welding',
          requiredCapabilityCode: null,
          minLocalContentPct: null,
          weight: 30,
        },
        {
          tenderId: tenderByRef.get('PPDA-EPC-2026-118')!,
          requirementType: 'scored',
          category: 'capability',
          title: 'ASME Steel Fabrication & Piping Shop',
          description: 'Verified workshop capacity in Uganda for pressure piping spools.',
          requiredCertType: null,
          requiredCapabilityCode: 'CAP-WLD-FAB',
          minLocalContentPct: null,
          weight: 40,
        },
        // Tender 3: HSE & Waste
        {
          tenderId: tenderByRef.get('PAU-HSE-2026-019')!,
          requirementType: 'mandatory',
          category: 'certification',
          title: 'Valid NEMA Hazardous Waste Management Licence',
          description: 'Active NEMA licence authorizing thermal treatment or disposal of drilling cuttings.',
          requiredCertType: 'NEMA Waste Licence',
          requiredCapabilityCode: null,
          minLocalContentPct: null,
          weight: 40,
        },
        {
          tenderId: tenderByRef.get('PAU-HSE-2026-019')!,
          requirementType: 'mandatory',
          category: 'certification',
          title: 'Valid ISO 45001 Safety Management',
          description: 'Unexpired ISO 45001 certification.',
          requiredCertType: 'ISO 45001',
          requiredCapabilityCode: null,
          minLocalContentPct: null,
          weight: 30,
        },
        {
          tenderId: tenderByRef.get('PAU-HSE-2026-019')!,
          requirementType: 'scored',
          category: 'capability',
          title: 'Environmental & Waste Management Operations',
          description: 'Verified Albertine Basin drilling waste treatment capacity.',
          requiredCertType: null,
          requiredCapabilityCode: 'CAP-HSE-ENV',
          minLocalContentPct: null,
          weight: 30,
        },
      ]);

      // 7. Historical Awards & Contracts
      await db.insert(awardsContracts).values([
        {
          tenderReference: 'UNOC-AWD-2025-014',
          title: 'Hoima Industrial Park Rig Component Drayage Phase 1',
          buyerOrganisation: 'Uganda National Oil Company (UNOC)',
          winningOrganisationId: orgByName.get('Albertine Heavy Logistics Ltd')!,
          winningProviderName: 'Albertine Heavy Logistics Ltd',
          sector: 'Petroleum',
          category: 'Logistics & Transport',
          contractValueUsd: 1940000,
          awardDate: '2025-09-14',
          status: 'Completed',
          provenanceSource: 'PPDA Best-Evaluated Bidder & Signed Contract Register',
        },
        {
          tenderReference: 'TIL-SUB-2025-088',
          title: 'Tilenga Support Base Structural Pipe Racks Supply',
          buyerOrganisation: 'Tilenga Upstream EPC Consortium',
          winningOrganisationId: orgByName.get('Nile Basin Fabrication & Piping SMC')!,
          winningProviderName: 'Nile Basin Fabrication & Piping SMC',
          sector: 'Petroleum',
          category: 'Engineering & Fabrication',
          contractValueUsd: 1420000,
          awardDate: '2025-11-20',
          status: 'Active',
          provenanceSource: 'Operator Local-Content Disclosure 2025',
        },
        {
          tenderReference: 'KFD-HSE-2025-032',
          title: 'Kingfisher Pad-2 Drilling Mud Cuttings Treatment',
          buyerOrganisation: 'CNOOC / Kingfisher Development JV',
          winningOrganisationId: orgByName.get('Rwenzori Environmental & Waste Solutions Ltd')!,
          winningProviderName: 'Rwenzori Environmental & Waste Solutions Ltd',
          sector: 'Petroleum',
          category: 'HSE & Compliance',
          contractValueUsd: 1180000,
          awardDate: '2026-02-05',
          status: 'Active',
          provenanceSource: 'PAU Annual Local Content Performance Report',
        },
        {
          tenderReference: 'PPDA-KIK-2024-210',
          title: 'Kikuube Feeder Corridor Drainage & Earthworks',
          buyerOrganisation: 'Ministry of Works / UNRA',
          winningOrganisationId: orgByName.get('Kampala Equatorial Civil Contractors Ltd')!,
          winningProviderName: 'Kampala Equatorial Civil Contractors Ltd',
          sector: 'Petroleum',
          category: 'Civil & Infrastructure',
          contractValueUsd: 960000,
          awardDate: '2024-08-19',
          status: 'Completed',
          provenanceSource: 'PPDA Government Procurement Portal',
        },
      ]);

      // 8. Regulatory & Knowledge Documents (RAG Grounding)
      await db.insert(documents).values([
        {
          code: 'DOC-PAU-NC-2025',
          title: 'Petroleum (Exploration, Development and Production) (National Content) Regulations — Ring-Fenced Goods & Services',
          docType: 'Regulation',
          sector: 'Petroleum',
          jurisdiction: 'Uganda',
          sourceName: 'Petroleum Authority of Uganda (PAU)',
          sourceUrl: 'https://www.pau.go.ug/faqs-2/',
          reuseRights: 'Public Statutory Text',
          confidenceTier: 'A',
          publishedDate: '2025-01-10',
          summary:
            'Defines 16 ring-fenced categories reserved exclusively for Ugandan companies (>=51% Ugandan citizen equity, local management, and PAU NSD registration), including transportation, catering, security, waste management, and clearing/forwarding.',
          contentText:
            'Under Regulation 10 of the Petroleum National Content Regulations, licensees and contractors must give priority to Ugandan goods and services. Ring-fenced services—including transportation and logistics, hazardous waste handling, catering, civil earthworks, and local supply—require active registration on the PAU National Supplier Database (NSD) and majority Ugandan ownership (>=51% equity) or approved joint venture compliance where specialized technology is unavailable locally.',
        },
        {
          code: 'DOC-PPDA-2026-G',
          title: 'PPDA Standard Bidding Requirements & HSE Prequalification Guidance for Energy Infrastructure',
          docType: 'Procurement Guideline',
          sector: 'Petroleum',
          jurisdiction: 'Uganda',
          sourceName: 'PPDA Government Procurement Portal',
          sourceUrl: 'https://gpp.ppda.go.ug/',
          reuseRights: 'Public Official Guidance',
          confidenceTier: 'A',
          publishedDate: '2026-04-02',
          summary:
            'Establishes mandatory verification of ISO 45001 (Safety), ISO 9001 (Quality), tax clearance, and valid NEMA licences at prequalification stage prior to financial bid evaluation.',
          contentText:
            'Bidders for Category-1 upstream oilfield logistics and fabrication packages must submit unexpired ISO 45001 and ISO 9001 certificates, valid NSSF/URA clearances, and statutory NEMA environmental permits where waste or emissions are involved. Expired certifications trigger automatic mandatory-gate disqualification unless a verified renewal receipt is approved by the evaluation committee.',
        },
        {
          code: 'DOC-EITI-UG-2026',
          title: 'Uganda Extractive Industries & Local Supply Capacity Market Brief 2026',
          docType: 'Market Report',
          sector: 'Energy',
          jurisdiction: 'Uganda',
          sourceName: 'Uganda EITI / UBOS Dataset Synthesis',
          sourceUrl: 'https://api.eiti.org/countries/uganda',
          reuseRights: 'Open Data CC-BY',
          confidenceTier: 'A',
          publishedDate: '2026-08-18',
          summary:
            'Highlights rising import demand for seamless carbon-steel line pipe (HS 7304) and diesel transport logistics as Tilenga and EACOP construction peaks in 2026–2027.',
          contentText:
            'Uganda petroleum development capex has driven a 28% year-on-year increase in heavy haulage demand and specialized steel spool imports. Local Ugandan fabrication shops meet approximately 34% of structural skid demand but face an acute import-substitution gap in high-pressure seamless pipe and automated SCADA instrumentation.',
        },
      ]);

      // 9. Commodities & Time Series (M13-M15 Market Intelligence)
      const insertedCommodities = await db
        .insert(commodities)
        .values([
          {
            code: 'BRENT-USD',
            name: 'Brent Crude Benchmark',
            sector: 'Petroleum',
            unit: 'USD / bbl',
            benchmark: 'ICE Brent Spot & Forecast',
            hsCode: '2709.00',
            importSubstitutionGapScore: 18,
          },
          {
            code: 'STEEL-PIPE-UG',
            name: 'Seamless Carbon Line Pipe Imports (Uganda)',
            sector: 'Petroleum',
            unit: 'Metric Tons / Mo',
            benchmark: 'UN Comtrade / UBOS HS 7304',
            hsCode: '7304.19',
            importSubstitutionGapScore: 84,
          },
          {
            code: 'IND-DIESEL-UG',
            name: 'Industrial Automotive Gas Oil (Diesel) Demand',
            sector: 'Energy',
            unit: 'Million Litres / Mo',
            benchmark: 'MEMD / UBOS Petroleum Imports',
            hsCode: '2710.19',
            importSubstitutionGapScore: 76,
          },
        ])
        .returning();

      const commByCode = new Map(insertedCommodities.map((c) => [c.code, c.id]));

      await db.insert(timeSeries).values([
        // Brent Actual + Forecast (2026-05 to 2027-04)
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-05', seriesType: 'actual', value: 76.4, lowerBound: null, upperBound: null, sourceName: 'World Bank Pink Sheet', confidenceTier: 'A' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-06', seriesType: 'actual', value: 78.1, lowerBound: null, upperBound: null, sourceName: 'World Bank Pink Sheet', confidenceTier: 'A' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-07', seriesType: 'actual', value: 79.8, lowerBound: null, upperBound: null, sourceName: 'U.S. EIA Open Data', confidenceTier: 'A' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-08', seriesType: 'actual', value: 77.2, lowerBound: null, upperBound: null, sourceName: 'U.S. EIA Open Data', confidenceTier: 'A' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-09', seriesType: 'actual', value: 80.5, lowerBound: null, upperBound: null, sourceName: 'World Bank Pink Sheet', confidenceTier: 'A' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-10', seriesType: 'actual', value: 82.0, lowerBound: null, upperBound: null, sourceName: 'World Bank Pink Sheet', confidenceTier: 'A' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-11', seriesType: 'forecast', value: 83.2, lowerBound: 78.5, upperBound: 88.0, sourceName: 'KINT M13 Model Forecast', confidenceTier: 'D' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2026-12', seriesType: 'forecast', value: 84.1, lowerBound: 77.9, upperBound: 90.4, sourceName: 'KINT M13 Model Forecast', confidenceTier: 'D' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2027-01', seriesType: 'forecast', value: 82.6, lowerBound: 75.4, upperBound: 91.2, sourceName: 'KINT M13 Model Forecast', confidenceTier: 'D' },
        { commodityId: commByCode.get('BRENT-USD')!, periodDate: '2027-02', seriesType: 'forecast', value: 81.4, lowerBound: 73.2, upperBound: 91.8, sourceName: 'KINT M13 Model Forecast', confidenceTier: 'D' },

        // Steel Pipe Import Demand vs Forecast
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-05', seriesType: 'actual', value: 3120, lowerBound: null, upperBound: null, sourceName: 'UN Comtrade HS 7304', confidenceTier: 'A' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-06', seriesType: 'actual', value: 3480, lowerBound: null, upperBound: null, sourceName: 'UN Comtrade HS 7304', confidenceTier: 'A' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-07', seriesType: 'actual', value: 3690, lowerBound: null, upperBound: null, sourceName: 'UN Comtrade HS 7304', confidenceTier: 'A' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-08', seriesType: 'actual', value: 4110, lowerBound: null, upperBound: null, sourceName: 'UN Comtrade HS 7304', confidenceTier: 'A' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-09', seriesType: 'actual', value: 4290, lowerBound: null, upperBound: null, sourceName: 'UN Comtrade HS 7304', confidenceTier: 'A' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-10', seriesType: 'actual', value: 4520, lowerBound: null, upperBound: null, sourceName: 'UN Comtrade HS 7304', confidenceTier: 'A' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-11', seriesType: 'forecast', value: 4780, lowerBound: 4410, upperBound: 5150, sourceName: 'KINT M14 Import Model', confidenceTier: 'D' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2026-12', seriesType: 'forecast', value: 4950, lowerBound: 4500, upperBound: 5420, sourceName: 'KINT M14 Import Model', confidenceTier: 'D' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2027-01', seriesType: 'forecast', value: 5120, lowerBound: 4580, upperBound: 5690, sourceName: 'KINT M14 Import Model', confidenceTier: 'D' },
        { commodityId: commByCode.get('STEEL-PIPE-UG')!, periodDate: '2027-02', seriesType: 'forecast', value: 4890, lowerBound: 4290, upperBound: 5510, sourceName: 'KINT M14 Import Model', confidenceTier: 'D' },
      ]);

      // 10. Events, M24 Anomalies & Agent Proposals (Human-in-the-Loop Approval Queue)
      await db.insert(events).values([
        {
          eventType: 'anomaly_m24',
          severity: 'warning',
          title: 'Expired ISO 9001 Certification Detected on Active Registry Profile',
          description:
            'Kampala Equatorial Civil Contractors Ltd holds UNBS-QMS-2023-312 which expired on 2026-08-31, while PAU NSD status remains Pending. Flagged for steward outreach.',
          entityType: 'organisation',
          entityId: orgByName.get('Kampala Equatorial Civil Contractors Ltd')!,
          agentId: 'A07',
          modelId: 'M24',
          payloadJson: {
            recommendedAction: 'Mark verificationStatus as Flagged and notify supplier of renewal gap',
            affectedCert: 'UNBS-QMS-2023-312',
          },
          status: 'open',
        },
        {
          eventType: 'agent_proposal',
          severity: 'info',
          title: 'A08 Data Steward: Upgrade Bunyoro Oilfield Logistics Confidence Tier Proposal',
          description:
            'A08 matched PAU NSD registration PAU-NSD-2026-0604 against Bunyoro Oilfield Logistics & Fleet Co., but ISO 9001 provenance originates from an unverified upload. Proposes steward review before Tier B promotion.',
          entityType: 'organisation',
          entityId: orgByName.get('Bunyoro Oilfield Logistics & Fleet Co.')!,
          agentId: 'A08',
          modelId: 'M01',
          payloadJson: {
            proposedConfidenceTier: 'B',
            proposedVerificationStatus: 'Verified',
          },
          status: 'open',
        },
        {
          eventType: 'agent_proposal',
          severity: 'warning',
          title: 'A02 Procurement Agent: UNOC Heavy Haulage Shortlist Ready for Analyst Sign-Off',
          description:
            'M07/M09 evaluation identifies Albertine Heavy Logistics Ltd as sole 100% compliant Ugandan bidder for UNOC-TEN-2026-041; recommends consortium outreach for Bunyoro Fleet.',
          entityType: 'tender',
          entityId: tenderByRef.get('UNOC-TEN-2026-041')!,
          agentId: 'A02',
          modelId: 'M07',
          payloadJson: {
            recommendedLeadSupplier: 'Albertine Heavy Logistics Ltd',
            complianceScore: 100,
          },
          status: 'open',
        },
        {
          eventType: 'licence_change',
          severity: 'warning',
          title: 'ASME IX Welding Renewal Window Approaching (< 30 Days)',
          description:
            'Nile Basin Fabrication & Piping SMC ASME-UG-2025-19 expires 2026-12-15 prior to PPDA-EPC-2026-118 deadline (2026-12-29).',
          entityType: 'organisation',
          entityId: orgByName.get('Nile Basin Fabrication & Piping SMC')!,
          agentId: 'A07',
          modelId: 'M21',
          payloadJson: {
            certRef: 'ASME-UG-2025-19',
            expiryDate: '2026-12-15',
          },
          status: 'open',
        },
      ]);

      // 11. Minerals & Geospatial Preview (Year 2-3 Expansion)
      await db.insert(mineralLicences).values([
        {
          licenceCode: 'MEMD-EL-2025-0412',
          holderName: 'Karamoja Gold & Copper Exploration Ltd',
          commodity: 'Gold / Copper',
          licenceType: 'Exploration',
          district: 'Moroto',
          areaKm2: 142.6,
          status: 'Active',
          expiryDate: '2028-04-19',
          infraProximityScore: 54,
          prospectivityTier: 'High Potential (Uncertain - Requires Field Assay)',
          provenanceSource: 'Uganda Mining Cadastre Portal',
        },
        {
          licenceCode: 'MEMD-ML-2024-0108',
          holderName: 'Kasese Cobalt & Polymetallic Recovery Co.',
          commodity: 'Cobalt / Copper',
          licenceType: 'Mining Lease',
          district: 'Kasese',
          areaKm2: 38.4,
          status: 'Active',
          expiryDate: '2035-11-30',
          infraProximityScore: 88,
          prospectivityTier: 'Confirmed Resource (Historic Tailings)',
          provenanceSource: 'Uganda Mining Cadastre Portal',
        },
        {
          licenceCode: 'MEMD-EL-2025-0789',
          holderName: 'Busoga Rare Earths & Vermiculite Holdings',
          commodity: 'Rare Earth Elements',
          licenceType: 'Exploration',
          district: 'Manafwa',
          areaKm2: 96.2,
          status: 'Renewal Pending',
          expiryDate: '2026-12-30',
          infraProximityScore: 79,
          prospectivityTier: 'Moderate Potential (Geophysics Anomaly)',
          provenanceSource: 'MEMD Geological Survey Department',
        },
      ]);

      // 12. Initial Feedback Label & Audit Trail
      await db.insert(feedbackLabels).values([
        {
          userUid: 'system-steward',
          targetType: 'supplier_match',
          targetId: 'UNOC-TEN-2026-041:Albertine Heavy Logistics Ltd',
          contextId: 'UNOC-TEN-2026-041',
          labelValue: 'relevant',
          notes: 'Verified active PAU NSD + 110T craneage fleet in Hoima.',
        },
      ]);

      await db.insert(auditLog).values([
        {
          actorUid: 'system-seed',
          actorEmail: 'steward@kint.intelligence',
          actorType: 'system',
          agentId: 'A10',
          modelId: 'M24',
          action: 'BASELINE_CANONICAL_INGEST',
          resourceType: 'platform',
          resourceId: 'petroleum-mvp-v1',
          inputsSummary: { sources: ['PAU NSD', 'PPDA', 'UNOC', 'MEMD', 'World Bank'] },
          outputsSummary: { organisations: 7, tenders: 3, documents: 3, commodities: 3 },
          sourceRefs: ['https://nsd.pau.go.ug/', 'https://gpp.ppda.go.ug/', 'https://www.unoc.co.ug/'],
        },
      ]);
    } catch (err) {
      seedPromise = null;
      console.error('Database seed error:', err);
      throw err;
    }
  })();

  return seedPromise;
}
