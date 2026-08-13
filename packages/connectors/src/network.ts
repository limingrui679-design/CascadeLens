import type {
  ConnectorDescriptor,
  ConnectorRequest,
  ConnectorSnapshot,
  FetchPolicy,
} from "./types";

const secretKeys = new Set([
  "api_key",
  "apikey",
  "subscription-key",
  "subscription_key",
  "token",
  "access_token",
  "key",
]);

const nextAllowedRequestAt = new Map<string, number>();

function validateUrl(descriptor: ConnectorDescriptor, value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new TypeError("Connector requests must use HTTPS.");
  if (url.username || url.password) throw new TypeError("Credentials may not be embedded in connector URLs.");
  if (!descriptor.allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new TypeError(`Host ${url.hostname} is not allowed for ${descriptor.id}.`);
  }
  return url;
}

export function sanitizeRequestUri(value: string): string {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) {
    if (secretKeys.has(key.toLowerCase())) url.searchParams.set(key, "REDACTED");
  }
  return url.toString();
}

function validateHeaders(headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
      throw new TypeError(`Invalid HTTP header name ${name}.`);
    }
    if (/\r|\n/.test(value)) throw new TypeError(`Invalid newline in HTTP header ${name}.`);
  }
}

async function boundedBody(response: Response, limit: number): Promise<Uint8Array> {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > limit) {
    throw new RangeError(`Response declares ${declared} bytes; connector limit is ${limit}.`);
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel("response_size_limit");
      throw new RangeError(`Response exceeded connector limit of ${limit} bytes.`);
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function sha256Bytes(value: Uint8Array): Promise<string> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function retryDelay(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return Math.min(Number(retryAfter) * 1_000, 5_000);
  }
  return Math.min(250 * 2 ** attempt, 2_000);
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function awaitRateSlot(descriptor: ConnectorDescriptor): Promise<void> {
  const now = Date.now();
  const allowedAt = nextAllowedRequestAt.get(descriptor.id) ?? now;
  const scheduledAt = Math.max(now, allowedAt);
  nextAllowedRequestAt.set(
    descriptor.id,
    scheduledAt + Math.max(0, descriptor.minimumIntervalMs),
  );
  if (scheduledAt > now) await pause(scheduledAt - now);
}

export function assertDistributionAllowed(
  descriptor: ConnectorDescriptor,
  artifact: "raw" | "normalized" | "manifest",
): void {
  if (artifact === "raw" && !descriptor.rawRedistributable) {
    throw new Error(
      `${descriptor.id} raw payloads are ${descriptor.redistributionMode}; export a manifest or lawful derived artifact instead.`,
    );
  }
}

export async function fetchConnectorSnapshot(
  descriptor: ConnectorDescriptor,
  request: ConnectorRequest,
  policy: FetchPolicy,
): Promise<ConnectorSnapshot> {
  if (descriptor.runtime !== "remote") {
    throw new Error(`${descriptor.id} is import-only and cannot issue network requests.`);
  }
  if (
    !policy.userAgent.trim() ||
    /your[- ]?(name|email)|placeholder/i.test(policy.userAgent) ||
    !(/[^\s@]+@[^\s@]+\.[^\s@]+/.test(policy.userAgent) || /https:\/\//i.test(policy.userAgent))
  ) {
    throw new TypeError("A real identifying connector user agent is required.");
  }
  const initialUrl = validateUrl(descriptor, request.url);
  const headers = {
    accept: "application/json, text/csv;q=0.9, application/xml;q=0.8",
    "user-agent": policy.userAgent,
    ...(request.headers ?? {}),
  };
  validateHeaders(headers);
  const fetchImpl = policy.fetchImpl ?? fetch;
  const retries = Math.max(0, Math.min(policy.retries ?? 2, 3));
  const timeoutMs = Math.max(250, Math.min(policy.timeoutMs ?? 20_000, 60_000));
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await awaitRateSlot(descriptor);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("connector_timeout"), timeoutMs);
    let response: Response | null = null;
    try {
      response = await fetchImpl(initialUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Connector received a redirect without Location.");
        validateUrl(descriptor, new URL(location, initialUrl).toString());
        throw new Error("Connector redirects are blocked; use the canonical documented endpoint.");
      }
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === retries) {
          throw new Error(`Connector request failed with HTTP ${response.status}.`);
        }
        await pause(retryDelay(response, attempt));
        continue;
      }
      const payload = await boundedBody(response, descriptor.maxResponseBytes);
      const retrievedAt = (policy.now?.() ?? new Date()).toISOString();
      return {
        connectorId: descriptor.id,
        requestUri: sanitizeRequestUri(initialUrl.toString()),
        retrievedAt,
        contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
        sha256: await sha256Bytes(payload),
        bytes: payload.byteLength,
        payload,
      };
    } catch (error) {
      lastError = error;
      if (attempt === retries || (error instanceof RangeError || error instanceof TypeError)) throw error;
      await pause(retryDelay(response, attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
