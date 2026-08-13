import type { EvidenceGrade, EvidenceUse } from "./types";

const rank: Record<EvidenceGrade, number> = {
  OFFICIAL_OBSERVED: 5,
  ENTITY_REPORTED: 4,
  THIRD_PARTY_VERIFIED: 3,
  TEXT_EXTRACTED: 2,
  MODEL_INFERRED: 1,
};

export function evidenceRank(grade: EvidenceGrade): number {
  return rank[grade];
}

export function allowedEvidenceUses(grade: EvidenceGrade): EvidenceUse[] {
  switch (grade) {
    case "OFFICIAL_OBSERVED":
    case "ENTITY_REPORTED":
    case "THIRD_PARTY_VERIFIED":
      return ["primary", "bounded", "retrieval"];
    case "TEXT_EXTRACTED":
    case "MODEL_INFERRED":
      return ["bounded", "retrieval"];
  }
}

export function canUseEvidence(
  grade: EvidenceGrade,
  use: EvidenceUse,
): boolean {
  return allowedEvidenceUses(grade).includes(use);
}

export function includedInBound(
  grade: EvidenceGrade,
  bound: "lower" | "central" | "upper",
): boolean {
  if (bound === "lower") {
    return grade === "OFFICIAL_OBSERVED" || grade === "ENTITY_REPORTED";
  }
  if (bound === "central") {
    return grade !== "TEXT_EXTRACTED" && grade !== "MODEL_INFERRED";
  }
  return true;
}
