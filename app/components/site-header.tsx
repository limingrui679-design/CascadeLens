import Link from "next/link";
import { Brand } from "./brand";

const links = [
  ["Workbench", "/workbench"],
  ["WorldGraph", "/worldgraph"],
  ["Cases", "/cases"],
  ["Benchmark", "/benchmark"],
  ["Data", "/data"],
  ["Method", "/methodology"],
  ["Docs", "/docs"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
        <nav aria-label="Primary navigation" className="primary-nav">
          {links.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <details className="mobile-nav">
          <summary>
            <span className="sr-only">Open navigation</span>
            <span aria-hidden="true" className="menu-lines"><i /><i /><i /></span>
          </summary>
          <nav aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
            <a href="https://github.com/limingrui679-design/cascadelens" rel="noreferrer" target="_blank">
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </details>
        <a
          className="github-link"
          href="https://github.com/limingrui679-design/cascadelens"
          rel="noreferrer"
          target="_blank"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  );
}
