export type StatusTone = "observed" | "verified" | "inferred" | "scenario" | "blocked";

export function Status({ children, tone }: { children: React.ReactNode; tone: StatusTone }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
