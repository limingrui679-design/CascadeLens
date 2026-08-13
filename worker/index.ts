/** Cloudflare Worker entry point for the hosted CascadeLens web product. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

declare const __CASCADELENS_BUILD_INFO__: {
  schemaVersion: string;
  project: string;
  repository: string;
  commit: string;
  tree: string;
  releaseTag: string | null;
  dirty: boolean;
  sourceIdentity: "git_commit" | "archive_unbound";
  packageVersion: string;
  builtAt: string;
  packageLockSha256: string;
  contentCatalogSha256: string;
  riskPackCatalogSha256: string;
  hostingProjectId: string;
  evidenceBoundary: string;
};

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const securityHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

const blockedInternalHeaders = [
  "x-prerender-revalidate",
  "x-prerender-revalidate-if-generated",
  "x-vinext-prerender-route-params",
  "x-vinext-prerender-secret",
  "x-vinext-prerender-speculative",
  "x-vinext-revalidate-host",
] as const;

function isForbiddenFrameworkControlRequest(request: Request, url: URL): boolean {
  if (url.pathname === "/__vinext" || url.pathname.startsWith("/__vinext/")) {
    return true;
  }
  if (blockedInternalHeaders.some((name) => request.headers.has(name))) {
    return true;
  }
  return /(?:^|;\s*)__prerender_bypass=/.test(
    request.headers.get("cookie") ?? "",
  );
}

function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes));
}

function contentSecurityPolicy(responseNonce?: string): string {
  const scriptSource = responseNonce
    ? `script-src 'self' 'nonce-${responseNonce}'`
    : "script-src 'self'";
  const styleSource = responseNonce
    ? `style-src 'self' 'nonce-${responseNonce}'`
    : "style-src 'self'";
  return `default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; ${scriptSource}; ${styleSource}; style-src-attr 'none'; upgrade-insecure-requests`;
}

async function harden(response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
  headers.delete("x-powered-by");
  const isHtml = /^text\/html\b/i.test(headers.get("content-type") ?? "");
  if (isHtml && response.body) {
    const responseNonce = nonce();
    const html = (await response.text())
      .replace(
        /<script(?![^>]*\bnonce=)/gi,
        `<script nonce="${responseNonce}"`,
      )
      .replace(
        /<style(?![^>]*\bnonce=)/gi,
        `<style nonce="${responseNonce}"`,
      );
    headers.set("Content-Security-Policy", contentSecurityPolicy(responseNonce));
    headers.delete("content-length");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  headers.set("Content-Security-Policy", contentSecurityPolicy());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CascadeLens does not expose framework draft, prerender, or on-demand
    // revalidation controls. Block their public paths, headers, and cookie at
    // the outer worker boundary before the framework handler can inspect them.
    if (isForbiddenFrameworkControlRequest(request, url)) {
      return harden(new Response("Forbidden", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }));
    }

    if (url.pathname === "/build-info.json") {
      return harden(new Response(
        `${JSON.stringify(__CASCADELENS_BUILD_INFO__, null, 2)}\n`,
        {
          headers: {
            "Cache-Control": "public, max-age=60, must-revalidate",
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      ));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return harden(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    return harden(await handler.fetch(request, env, ctx));
  },
};

export default worker;
