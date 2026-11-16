export interface SupplierMatchResult {
  organisationId: number;
  legalName: string;
  district: string;
  ownershipType: string;
  localContentPct: number;
  pauNsdNumber: string | null;
  pauNsdStatus: string;
  confidenceTier: string;
  verificationStatus: string;
  m09ReadinessScore: number;
  m07RankScore: number;
  complianceStatus: 'Compliant' | 'Conditional Gap' | 'Non-Compliant';
  passedRequirements: string[];
  missingMandatory: string[];
  expiringSoon: string[];
  capabilityMatches: string[];
  relevantAwardsCount: number;
  relevantAwardsValueUsd: number;
  explanation: string;
}

export function evaluateSupplierAgainstTender(
  org: {
    id: number;
    legalName: string;
    orgRole: string;
    district: string;
    ownershipType: string;
    localContentPct: number;
    pauNsdNumber: string | null;
    pauNsdStatus: string;
    confidenceTier: string;
    verificationStatus: string;
  },
  orgCaps: Array<{ code: string; name: string; verified: boolean }>,
  orgCerts: Array<{ certType: string; status: string; validTo: string; referenceNumber: string }>,
  orgAwards: Array<{ category: string; contractValueUsd: number; title: string }>,
  tender: { category: string; deadline: string },
  requirements: Array<{
    requirementType: string;
    category: string;
    title: string;
    requiredCertType: string | null;
    requiredCapabilityCode: string | null;
    minLocalContentPct: number | null;
    weight: number;
  }>
): SupplierMatchResult {
  const passedRequirements: string[] = [];
  const missingMandatory: string[] = [];
  const expiringSoon: string[] = [];
  const capabilityMatches: string[] = [];

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const req of requirements) {
    totalWeight += req.weight;
    let met = false;

    if (req.category === 'registration') {
      met = org.pauNsdStatus === 'Active';
      if (!met) {
        missingMandatory.push(`${req.title} (Current status: ${org.pauNsdStatus})`);
      }
    } else if (req.category === 'local_content') {
      const minPct = req.minLocalContentPct ?? 51;
      met = org.localContentPct >= minPct;
      if (!met) {
        missingMandatory.push(`${req.title} (${org.localContentPct}% < ${minPct}%)`);
      }
    } else if (req.category === 'certification' && req.requiredCertType) {
      const matchingCert = orgCerts.find(
        (c) => c.certType.toLowerCase() === req.requiredCertType!.toLowerCase()
      );
      if (!matchingCert) {
        missingMandatory.push(`Missing ${req.requiredCertType}`);
      } else if (matchingCert.status === 'Expired') {
        missingMandatory.push(`${req.requiredCertType} expired (${matchingCert.validTo})`);
      } else if (matchingCert.status === 'Expiring Soon' || matchingCert.validTo < tender.deadline) {
        met = true;
        expiringSoon.push(
          `${req.requiredCertType} (${matchingCert.referenceNumber}) expires ${matchingCert.validTo} before tender deadline ${tender.deadline}`
        );
      } else {
        met = true;
      }
    } else if (req.category === 'capability' && req.requiredCapabilityCode) {
      const cap = orgCaps.find((c) => c.code === req.requiredCapabilityCode);
      if (cap) {
        met = true;
        capabilityMatches.push(`${cap.name}${cap.verified ? '' : ' (Unverified)'}`);
      } else if (req.requirementType === 'mandatory') {
        missingMandatory.push(`Missing capability ${req.requiredCapabilityCode}`);
      }
    }

    if (met) {
      earnedWeight += req.weight;
      passedRequirements.push(req.title);
    }
  }

  const m09ReadinessScore =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

  // Historical awards alignment in matching category
  const matchingAwards = orgAwards.filter(
    (a) => a.category.toLowerCase() === tender.category.toLowerCase()
  );
  const relevantAwardsValueUsd = matchingAwards.reduce(
    (acc, a) => acc + Number(a.contractValueUsd || 0),
    0
  );

  // Confidence tier bonus (A=12, B=8, C=3, D=0)
  const tierBonus =
    org.confidenceTier === 'A'
      ? 12
      : org.confidenceTier === 'B'
      ? 8
      : org.confidenceTier === 'C'
      ? 3
      : 0;

  const awardsBonus = Math.min(18, matchingAwards.length * 12);
  const capBonus = capabilityMatches.length > 0 ? 10 : 0;

  // M07 composite ranking score (0-100), penalized when mandatory constraints fail
  const baseRank = Math.round(m09ReadinessScore * 0.6 + tierBonus + awardsBonus + capBonus);
  const m07RankScore = Math.max(
    5,
    Math.min(100, missingMandatory.length > 0 ? Math.min(baseRank, 64) : baseRank)
  );

  let complianceStatus: 'Compliant' | 'Conditional Gap' | 'Non-Compliant' = 'Compliant';
  if (missingMandatory.length > 0) {
    complianceStatus = m09ReadinessScore >= 50 ? 'Conditional Gap' : 'Non-Compliant';
  } else if (expiringSoon.length > 0 || org.verificationStatus !== 'Verified') {
    complianceStatus = 'Conditional Gap';
  }

  const explanationParts: string[] = [];
  if (missingMandatory.length === 0 && expiringSoon.length === 0) {
    explanationParts.push('Satisfies all mandatory regulatory and certification gates.');
  } else if (missingMandatory.length > 0) {
    explanationParts.push(`Fails ${missingMandatory.length} mandatory requirement(s).`);
  }
  if (expiringSoon.length > 0) {
    explanationParts.push(`Renewal attention needed on ${expiringSoon.length} certificate(s).`);
  }
  if (matchingAwards.length > 0) {
    explanationParts.push(
      `Proven track record with ${matchingAwards.length} prior ${tender.category} contract(s).`
    );
  }
  if (capabilityMatches.length === 0) {
    explanationParts.push('No direct verified capability match in primary tender taxonomy.');
  }

  return {
    organisationId: org.id,
    legalName: org.legalName,
    district: org.district,
    ownershipType: org.ownershipType,
    localContentPct: org.localContentPct,
    pauNsdNumber: org.pauNsdNumber,
    pauNsdStatus: org.pauNsdStatus,
    confidenceTier: org.confidenceTier,
    verificationStatus: org.verificationStatus,
    m09ReadinessScore,
    m07RankScore,
    complianceStatus,
    passedRequirements,
    missingMandatory,
    expiringSoon,
    capabilityMatches,
    relevantAwardsCount: matchingAwards.length,
    relevantAwardsValueUsd,
    explanation: explanationParts.join(' '),
  };
}
