import dns from "node:dns";
import net from "node:net";

function loopback(host) {
  if (host === undefined || host === null || host === "") return true;
  const normalized = String(host).replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("::ffff:127.")
  );
}

function offlineError(host) {
  const error = new Error(
    `Offline build blocked a non-loopback network request to ${String(host)}.`,
  );
  error.code = "ENETUNREACH";
  return error;
}

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  const first = args[0];
  const host =
    first && typeof first === "object"
      ? first.host ?? first.hostname
      : typeof first === "number"
        ? args[1]
        : undefined;
  if (!loopback(host)) throw offlineError(host);
  return originalConnect.apply(this, args);
};

const originalLookup = dns.lookup;
dns.lookup = function guardedLookup(hostname, ...args) {
  if (!loopback(hostname)) {
    const callback = args.find((item) => typeof item === "function");
    if (callback) {
      queueMicrotask(() => callback(offlineError(hostname)));
      return;
    }
    throw offlineError(hostname);
  }
  return originalLookup.call(this, hostname, ...args);
};

for (const method of [
  "resolve",
  "resolve4",
  "resolve6",
  "resolveAny",
  "resolveCaa",
  "resolveCname",
  "resolveMx",
  "resolveNaptr",
  "resolveNs",
  "resolvePtr",
  "resolveSoa",
  "resolveSrv",
  "resolveTxt",
  "reverse",
]) {
  const original = dns[method];
  if (typeof original !== "function") continue;
  dns[method] = function guardedResolve(hostname, ...args) {
    if (!loopback(hostname)) {
      const callback = args.find((item) => typeof item === "function");
      if (callback) {
        queueMicrotask(() => callback(offlineError(hostname)));
        return;
      }
      throw offlineError(hostname);
    }
    return original.call(this, hostname, ...args);
  };
}

if (typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function guardedFetch(input, init) {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
      "http://localhost",
    );
    if (!loopback(url.hostname)) return Promise.reject(offlineError(url.hostname));
    return originalFetch(input, init);
  };
}
