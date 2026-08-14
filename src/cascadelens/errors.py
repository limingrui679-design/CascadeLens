"""Typed, path-addressable validation errors."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    """One validation finding with a stable machine-readable code."""

    path: str
    code: str
    message: str
    severity: Literal["error", "warning"] = "error"

    def render(self) -> str:
        return f"{self.path} [{self.code}]: {self.message}"


class CascadeLensValidationError(ValueError):
    """Raised when an artifact violates a CascadeLens contract."""

    def __init__(self, message: str, issues: Iterable[ValidationIssue]):
        self.issues = tuple(issue for issue in issues if issue.severity == "error")
        rendered = "\n".join(f"- {issue.render()}" for issue in self.issues)
        detail = f"\n{rendered}" if rendered else ""
        super().__init__(message + detail)


def errors_only(issues: Iterable[ValidationIssue]) -> list[ValidationIssue]:
    return [issue for issue in issues if issue.severity == "error"]


def assert_no_errors(message: str, issues: Iterable[ValidationIssue]) -> None:
    errors = errors_only(issues)
    if errors:
        raise CascadeLensValidationError(message, errors)
