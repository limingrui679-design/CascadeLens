export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: IssueSeverity;
}

export class CascadeLensValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "CascadeLensValidationError";
    this.issues = issues;
  }
}

export function errorsOnly(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === "error");
}

export function assertNoErrors(
  message: string,
  issues: ValidationIssue[],
): void {
  const errors = errorsOnly(issues);
  if (errors.length > 0) {
    throw new CascadeLensValidationError(message, errors);
  }
}
