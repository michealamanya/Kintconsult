import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users (Linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Analyst'),
  role: text('role').notNull().default('analyst'), // analyst | operator | steward | admin
  organisationScope: text('organisation_scope').notNull().default('KINT Advisory'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
});

// 2. Organisations (Canonical Company / Buyer / Operator / Regulator Registry)
export const organisations = pgTable('organisations', {
  id: serial('id').primaryKey(),
  legalName: text('legal_name').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  orgRole: text('org_role').notNull().default('supplier'), // supplier | operator | epc | regulator
  sector: text('sector').notNull().default('Petroleum'), // Petroleum | Energy | Petrochemicals | Minerals
  subsector: text('subsector').notNull(),
  district: text('district').notNull(),
  country: text('country').notNull().default('Uganda'),
  ownershipType: text('ownership_type').notNull().default('Ugandan Owned'), // Ugandan Owned | Joint Venture | International
  localContentPct: integer('local_content_pct').notNull().default(100),
  pauNsdNumber: text('pau_nsd_number'),
  pauNsdStatus: text('pau_nsd_status').notNull().default('Active'), // Active | Pending | Suspended | N/A
  website: text('website'),
  confidenceTier: text('confidence_tier').notNull().default('A'), // A | B | C | D
  provenanceSource: text('provenance_source').notNull(),
  provenanceUrl: text('provenance_url'),
  verificationStatus: text('verification_status').notNull().default('Verified'), // Verified | Needs Review | Flagged
  verifiedBy: text('verified_by'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Capabilities Taxonomy
export const capabilities = pgTable('capabilities', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sector: text('sector').notNull(),
  parentCategory: text('parent_category').notNull(),
  description: text('description').notNull(),
});

// 4. Organisation-Capabilities Links (Evidence-backed)
export const organisationCapabilities = pgTable('organisation_capabilities', {
  id: serial('id').primaryKey(),
  organisationId: integer('organisation_id')
    .references(() => organisations.id, { onDelete: 'cascade' })
    .notNull(),
  capabilityId: integer('capability_id')
    .references(() => capabilities.id, { onDelete: 'cascade' })
    .notNull(),
  evidenceSummary: text('evidence_summary').notNull(),
  equipmentNotes: text('equipment_notes'),
  capacityMetric: text('capacity_metric'),
  confidenceTier: text('confidence_tier').notNull().default('A'),
  verified: boolean('verified').notNull().default(true),
});

// 5. Certifications & Licences
export const certifications = pgTable('certifications', {
  id: serial('id').primaryKey(),
  organisationId: integer('organisation_id')
    .references(() => organisations.id, { onDelete: 'cascade' })
    .notNull(),
  certType: text('cert_type').notNull(), // e.g., ISO 9001, ISO 45001, PAU NSD, NEMA EIA, PPDA
  issuer: text('issuer').notNull(),
  referenceNumber: text('reference_number').notNull(),
  status: text('status').notNull().default('Valid'), // Valid | Expiring Soon | Expired | Pending
  validFrom: text('valid_from').notNull(), // YYYY-MM-DD
  validTo: text('valid_to').notNull(), // YYYY-MM-DD
  scope: text('scope').notNull(),
  provenanceSource: text('provenance_source').notNull(),
});

// 6. Tenders & Opportunities (PPDA, UNOC, Operator EPCs)
export const tenders = pgTable('tenders', {
  id: serial('id').primaryKey(),
  referenceCode: text('reference_code').notNull().unique(),
  title: text('title').notNull(),
  buyerOrganisation: text('buyer_organisation').notNull(),
  sector: text('sector').notNull().default('Petroleum'),
  category: text('category').notNull(),
  location: text('location').notNull(),
  deadline: text('deadline').notNull(), // YYYY-MM-DD
  estimatedValueUsd: doublePrecision('estimated_value_usd').notNull(),
  status: text('status').notNull().default('Open'), // Open | Evaluation | Awarded | Closed
  summary: text('summary').notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url'),
  confidenceTier: text('confidence_tier').notNull().default('A'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Tender Requirements (Mandatory & Scored Gates for M07/M09)
export const tenderRequirements = pgTable('tender_requirements', {
  id: serial('id').primaryKey(),
  tenderId: integer('tender_id')
    .references(() => tenders.id, { onDelete: 'cascade' })
    .notNull(),
  requirementType: text('requirement_type').notNull(), // mandatory | scored
  category: text('category').notNull(), // certification | capability | registration | local_content | experience
  title: text('title').notNull(),
  description: text('description').notNull(),
  requiredCertType: text('required_cert_type'),
  requiredCapabilityCode: text('required_capability_code'),
  minLocalContentPct: integer('min_local_content_pct'),
  weight: integer('weight').notNull().default(20),
});

// 8. Historical Awards & Contracts
export const awardsContracts = pgTable('awards_contracts', {
  id: serial('id').primaryKey(),
  tenderReference: text('tender_reference').notNull(),
  title: text('title').notNull(),
  buyerOrganisation: text('buyer_organisation').notNull(),
  winningOrganisationId: integer('winning_organisation_id').references(
    () => organisations.id,
    { onDelete: 'set null' }
  ),
  winningProviderName: text('winning_provider_name').notNull(),
  sector: text('sector').notNull().default('Petroleum'),
  category: text('category').notNull(),
  contractValueUsd: doublePrecision('contract_value_usd').notNull(),
  awardDate: text('award_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('Completed'), // Active | Completed
  provenanceSource: text('provenance_source').notNull(),
});

// 9. Regulatory & Knowledge Documents (RAG Grounding Source)
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  docType: text('doc_type').notNull(), // Regulation | Procurement Guideline | Market Report | Geological Survey
  sector: text('sector').notNull(),
  jurisdiction: text('jurisdiction').notNull().default('Uganda'),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url'),
  reuseRights: text('reuse_rights').notNull().default('Public / Official Reference'),
  confidenceTier: text('confidence_tier').notNull().default('A'),
  publishedDate: text('published_date').notNull(),
  summary: text('summary').notNull(),
  contentText: text('content_text').notNull(),
});

// 10. Commodities & Macroeconomic / Trade Series
export const commodities = pgTable('commodities', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sector: text('sector').notNull(),
  unit: text('unit').notNull(),
  benchmark: text('benchmark').notNull(),
  hsCode: text('hs_code').notNull(),
  importSubstitutionGapScore: integer('import_substitution_gap_score').notNull().default(0),
});

export const timeSeries = pgTable('time_series', {
  id: serial('id').primaryKey(),
  commodityId: integer('commodity_id')
    .references(() => commodities.id, { onDelete: 'cascade' })
    .notNull(),
  periodDate: text('period_date').notNull(), // YYYY-MM
  seriesType: text('series_type').notNull(), // actual | forecast | import_volume | local_supply
  value: doublePrecision('value').notNull(),
  lowerBound: doublePrecision('lower_bound'),
  upperBound: doublePrecision('upper_bound'),
  sourceName: text('source_name').notNull(),
  confidenceTier: text('confidence_tier').notNull().default('A'),
});

// 11. Events, Anomalies (M24) & Agent Proposals (Human-in-the-Loop Queue)
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(), // agent_proposal | anomaly_m24 | tender_new | licence_change | price_shock
  severity: text('severity').notNull().default('info'), // info | warning | critical
  title: text('title').notNull(),
  description: text('description').notNull(),
  entityType: text('entity_type'), // organisation | tender | certification | award
  entityId: integer('entity_id'),
  agentId: text('agent_id'), // A02 | A07 | A08
  modelId: text('model_id'), // M01 | M07 | M24
  payloadJson: jsonb('payload_json').$type<Record<string, unknown>>(),
  status: text('status').notNull().default('open'), // open | approved | rejected | resolved
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Compounding Feedback Labels (Section 7.3)
export const feedbackLabels = pgTable('feedback_labels', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  targetType: text('target_type').notNull(), // supplier_match | copilot_answer | entity_verification | anomaly_flag
  targetId: text('target_id').notNull(),
  contextId: text('context_id'),
  labelValue: text('label_value').notNull(), // relevant | not_relevant | verified | gap_flagged | accurate | unsupported
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Immutable Audit Log (Section 9.1 & 11.3)
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorEmail: text('actor_email').notNull(),
  actorType: text('actor_type').notNull().default('user'), // user | agent | system
  agentId: text('agent_id'),
  modelId: text('model_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  inputsSummary: jsonb('inputs_summary').$type<Record<string, unknown>>(),
  outputsSummary: jsonb('outputs_summary').$type<Record<string, unknown>>(),
  sourceRefs: jsonb('source_refs').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Minerals Cadastre & Geospatial Preview (Year 2-3 Expansion Schema)
export const mineralLicences = pgTable('mineral_licences', {
  id: serial('id').primaryKey(),
  licenceCode: text('licence_code').notNull().unique(),
  holderName: text('holder_name').notNull(),
  commodity: text('commodity').notNull(),
  licenceType: text('licence_type').notNull(), // Exploration | Mining Lease | Retention
  district: text('district').notNull(),
  areaKm2: doublePrecision('area_km2').notNull(),
  status: text('status').notNull(), // Active | Renewal Pending | Expired
  expiryDate: text('expiry_date').notNull(),
  infraProximityScore: integer('infra_proximity_score').notNull(), // M20 Score 0-100
  prospectivityTier: text('prospectivity_tier').notNull(), // High Potential (Uncertain) | Moderate | Early Survey
  provenanceSource: text('provenance_source').notNull(),
});

// Relations
export const organisationsRelations = relations(organisations, ({ many }) => ({
  capabilities: many(organisationCapabilities),
  certifications: many(certifications),
  awards: many(awardsContracts),
}));

export const organisationCapabilitiesRelations = relations(
  organisationCapabilities,
  ({ one }) => ({
    organisation: one(organisations, {
      fields: [organisationCapabilities.organisationId],
      references: [organisations.id],
    }),
    capability: one(capabilities, {
      fields: [organisationCapabilities.capabilityId],
      references: [capabilities.id],
    }),
  })
);

export const certificationsRelations = relations(certifications, ({ one }) => ({
  organisation: one(organisations, {
    fields: [certifications.organisationId],
    references: [organisations.id],
  }),
}));

export const tendersRelations = relations(tenders, ({ many }) => ({
  requirements: many(tenderRequirements),
}));

export const tenderRequirementsRelations = relations(tenderRequirements, ({ one }) => ({
  tender: one(tenders, {
    fields: [tenderRequirements.tenderId],
    references: [tenders.id],
  }),
}));

export const awardsContractsRelations = relations(awardsContracts, ({ one }) => ({
  winner: one(organisations, {
    fields: [awardsContracts.winningOrganisationId],
    references: [organisations.id],
  }),
}));

export const commoditiesRelations = relations(commodities, ({ many }) => ({
  series: many(timeSeries),
}));

export const timeSeriesRelations = relations(timeSeries, ({ one }) => ({
  commodity: one(commodities, {
    fields: [timeSeries.commodityId],
    references: [commodities.id],
  }),
}));
