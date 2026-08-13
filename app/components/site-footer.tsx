import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <Brand />
          <p className="footer-copy">
            Evidence-graded systemic-risk analysis with explicit uncertainty and portable provenance.
          </p>
        </div>
        <div>
          <p className="footer-label">Product</p>
          <Link href="/workbench">Scenario workbench</Link>
          <Link href="/worldgraph">WorldGraph explorer</Link>
          <Link href="/cases">Reference cases</Link>
        </div>
        <div>
          <p className="footer-label">Evidence</p>
          <Link href="/benchmark">CascadeBench</Link>
          <Link href="/data">Data catalog</Link>
          <Link href="/methodology">Methodology</Link>
        </div>
        <div>
          <p className="footer-label">Build</p>
          <Link href="/docs">Documentation</Link>
          <a href="https://github.com/limingrui679-design/CascadeLens" rel="noreferrer" target="_blank">
            Source code ↗
          </a>
          <Link href="/docs#security">Security model</Link>
          <a href="/build-info.json">Build identity</a>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>Apache-2.0 · Research software</span>
        <span>No investment, legal, clinical, or emergency-response advice.</span>
      </div>
    </footer>
  );
}
