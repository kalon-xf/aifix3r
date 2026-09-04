import net from "node:net";

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeTarget(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\0\r\n]/.test(value)) return null;
  const raw = value.trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || (!net.isIP(host) && !host.split('.').every((label) => HOST_LABEL.test(label)))) return null;
  if (url.port && !/^\d{1,5}$/.test(url.port)) return null;
  return { raw, host, port: url.port || null, pathname: url.pathname || "/", url: url.toString() };
}

export function normalizeScope(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  const cidr = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d|[12]\d|3[0-2])$/);
  if (cidr && net.isIP(cidr[1]) === 4) return { cidr: trimmed, network: ipv4(cidr[1]), prefix: Number(cidr[2]), wildcard: false };
  const wildcard = trimmed.startsWith("*.");
  const parsed = normalizeTarget(wildcard ? trimmed.slice(2) : trimmed);
  return parsed ? { host: parsed.host, port: parsed.port, pathname: parsed.pathname, wildcard } : null;
}

function ipv4(host) { return host.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0); }

function matches(target, rule) {
  if (rule.cidr) {
    if (net.isIP(target.host) !== 4) return false;
    const mask = rule.prefix === 0 ? 0 : (0xffffffff << (32 - rule.prefix)) >>> 0;
    return (ipv4(target.host) & mask) === (rule.network & mask);
  }
  const hostMatches = rule.wildcard ? target.host !== rule.host && target.host.endsWith(`.${rule.host}`) : target.host === rule.host;
  if (!hostMatches || (rule.port && target.port !== rule.port)) return false;
  if (!rule.pathname || rule.pathname === "/") return true;
  const prefix = rule.pathname.endsWith("/") ? rule.pathname : `${rule.pathname}/`;
  return target.pathname === rule.pathname || target.pathname.startsWith(prefix);
}

export function evaluateScope(target, includes, excludes) {
  const parsed = normalizeTarget(target);
  if (!parsed) return { allowed: false, reason: "Target is not a valid HTTP(S) URL or hostname." };
  const includeRules = Array.isArray(includes) ? includes.map(normalizeScope).filter(Boolean) : [];
  const excludeRules = Array.isArray(excludes) ? excludes.map(normalizeScope).filter(Boolean) : [];
  if (!includeRules.length) return { allowed: false, reason: "At least one include scope is required." };
  if (excludeRules.some((rule) => matches(parsed, rule))) return { allowed: false, reason: "Target matches an exclusion." };
  if (!includeRules.some((rule) => matches(parsed, rule))) return { allowed: false, reason: "Target is outside the allowlist." };
  return { allowed: true, target: parsed };
}

export function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
