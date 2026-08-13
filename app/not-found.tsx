import Link from "next/link";
import { PageShell } from "./components/page-shell";
import { Eyebrow } from "./components/status";

export default function NotFound() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>404 · Unknown route</Eyebrow>
        <h1>This path is outside the graph.</h1>
        <p className="page-intro-copy">No page or reference case exists at this address.</p>
        <div className="button-row"><Link className="button button-primary" href="/">Return home</Link></div>
      </section>
    </PageShell>
  );
}
