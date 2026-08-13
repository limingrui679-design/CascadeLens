import Link from "next/link";
import { GitBranch } from "lucide-react";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="CascadeLens home">
      <span className="brand-mark" aria-hidden="true">
        <GitBranch size={19} strokeWidth={2.2} />
      </span>
      <span>CascadeLens</span>
    </Link>
  );
}
