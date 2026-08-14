"""Evidence-grade policy used by all bounds."""

from __future__ import annotations

from typing import Literal

EvidenceGrade = Literal[
    "OFFICIAL_OBSERVED",
    "ENTITY_REPORTED",
    "THIRD_PARTY_VERIFIED",
    "TEXT_EXTRACTED",
    "MODEL_INFERRED",
]
Bound = Literal["lower", "central", "upper"]

EVIDENCE_GRADES: tuple[EvidenceGrade, ...] = (
    "OFFICIAL_OBSERVED",
    "ENTITY_REPORTED",
    "THIRD_PARTY_VERIFIED",
    "TEXT_EXTRACTED",
    "MODEL_INFERRED",
)

_RANK: dict[EvidenceGrade, int] = {
    "OFFICIAL_OBSERVED": 5,
    "ENTITY_REPORTED": 4,
    "THIRD_PARTY_VERIFIED": 3,
    "TEXT_EXTRACTED": 2,
    "MODEL_INFERRED": 1,
}


def evidence_rank(grade: EvidenceGrade) -> int:
    return _RANK[grade]


def allowed_uses(grade: EvidenceGrade) -> tuple[str, ...]:
    if grade in {"OFFICIAL_OBSERVED", "ENTITY_REPORTED", "THIRD_PARTY_VERIFIED"}:
        return ("primary", "bounded", "retrieval")
    return ("bounded", "retrieval")


def can_use(grade: EvidenceGrade, use: str) -> bool:
    return use in allowed_uses(grade)


def included_in_bound(grade: EvidenceGrade, bound: Bound) -> bool:
    if bound == "lower":
        return grade in {"OFFICIAL_OBSERVED", "ENTITY_REPORTED"}
    if bound == "central":
        return grade not in {"TEXT_EXTRACTED", "MODEL_INFERRED"}
    return True
