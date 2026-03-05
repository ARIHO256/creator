import { randomUUID } from "node:crypto";
import { HttpError } from "./http.js";

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function pick(source, keys) {
  return keys.reduce((acc, key) => {
    if (source[key] !== undefined) acc[key] = source[key];
    return acc;
  }, {});
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) {
    throw new HttpError(400, "VALIDATION_ERROR", "Required fields are missing.", { missing });
  }
}

export function ensure(condition, message, code = "VALIDATION_ERROR", status = 400, details = undefined) {
  if (!condition) {
    throw new HttpError(status, code, message, details);
  }
}

export function textMatch(value, query) {
  if (!query) return true;
  return String(value || "").toLowerCase().includes(String(query).toLowerCase());
}

export function applySearch(items, query, fields) {
  if (!query) return items;
  return items.filter((item) =>
    fields.some((field) => {
      const value = typeof field === "function" ? field(item) : item[field];
      if (Array.isArray(value)) return value.some((entry) => textMatch(entry, query));
      return textMatch(value, query);
    })
  );
}

export function applyFilter(items, queryValue, field, normalize = (v) => v) {
  if (!queryValue) return items;
  return items.filter((item) => normalize(item[field]) === normalize(queryValue));
}

export function sortBy(items, field, dir = "desc") {
  const copy = [...items];
  copy.sort((a, b) => {
    const va = a[field];
    const vb = b[field];
    if (va === vb) return 0;
    if (va === undefined || va === null) return 1;
    if (vb === undefined || vb === null) return -1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return dir === "asc" ? -1 : 1;
  });
  return copy;
}

export function paginate(items, searchParams) {
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize") || "50"), 100);
  const total = items.length;
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

export function pushAudit(db, entry) {
  db.auditLogs.unshift({
    id: id("audit"),
    at: nowIso(),
    severity: "info",
    ...entry
  });
}

export function summarizeNavBadges(db, userId) {
  return {
    opportunities: db.opportunities.filter((x) => x.status === "open").length,
    sellers: db.sellers.filter((x) => x.openToCollabs).length,
    "my-sellers": db.sellers.filter((x) => x.relationship !== "none").length,
    invites: db.invites.filter((x) => x.userId === userId && x.status === "pending").length,
    "creator-campaigns": db.campaigns.filter((x) => x.ownerUserId === userId && x.status !== "completed").length,
    proposals: db.proposals.filter((x) => x.userId === userId && !["declined", "archived"].includes(x.status)).length,
    contracts: db.contracts.filter((x) => x.userId === userId && ["active", "at_risk"].includes(x.status)).length
  };
}
