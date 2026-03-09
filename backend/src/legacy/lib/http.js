export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
  "content-type": "application/json; charset=utf-8"
};

export function sendJson(res, status, payload) {
  res.writeHead(status, corsHeaders);
  if (payload === null) {
    res.end("");
    return;
  }
  res.end(JSON.stringify(payload, null, 2));
}

export function ok(data, meta) {
  return { status: 200, body: { ok: true, data, ...(meta ? { meta } : {}) } };
}

export function created(data, meta) {
  return { status: 201, body: { ok: true, data, ...(meta ? { meta } : {}) } };
}

export function noContent() {
  return { status: 204, body: null };
}

export function fail(status, code, message, details) {
  throw new HttpError(status, code, message, details);
}

export function readJson(req) {
  if (req._cachedJsonPromise) return req._cachedJsonPromise;
  if (typeof req.body !== "undefined") {
    req._cachedJsonPromise = Promise.resolve(req.body || {});
    return req._cachedJsonPromise;
  }
  req._cachedJsonPromise = new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new HttpError(400, "INVALID_JSON", "Request body is not valid JSON."));
      }
    });
    req.on("error", reject);
  });
  return req._cachedJsonPromise;
}

export function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, null);
    return true;
  }
  return false;
}

export function serializeError(error) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {})
        }
      }
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error?.message || "An unexpected error occurred."
      }
    }
  };
}
