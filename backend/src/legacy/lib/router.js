import { HttpError, handleOptions, readJson, sendJson, serializeError } from "./http.js";

function compilePattern(pattern) {
  const keys = [];
  const normalized = pattern.replace(/\/:([A-Za-z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return "/([^/]+)";
  });
  return {
    regex: new RegExp(`^${normalized}/?$`),
    keys
  };
}

export class Router {
  constructor({ store, authenticate }) {
    this.routes = [];
    this.store = store;
    this.authenticate = authenticate;
  }

  add(method, pattern, options, handler) {
    let routeOptions = options;
    let routeHandler = handler;
    if (typeof options === "function") {
      routeHandler = options;
      routeOptions = {};
    }
    const compiled = compilePattern(pattern);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      ...compiled,
      handler: routeHandler,
      options: routeOptions || {}
    });
    return this;
  }

  describe() {
    return this.routes.map((route) => ({
      method: route.method,
      path: route.pattern,
      tag: route.options.tag || "general",
      auth: Boolean(route.options.auth),
      description: route.options.description || ""
    }));
  }

  async handle(req, res) {
    if (handleOptions(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    try {
      const match = this.routes.find((route) => route.method === method && route.regex.test(pathname));
      if (!match) {
        throw new HttpError(404, "NOT_FOUND", `No route matches ${method} ${pathname}`);
      }

      const matchResult = pathname.match(match.regex);
      const params = {};
      match.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(matchResult[index + 1]);
      });

      const context = {
        req,
        res,
        url,
        query: url.searchParams,
        params,
        store: this.store,
        routes: this.describe(),
        readBody: () => readJson(req),
        auth: null
      };

      if (match.options.auth) {
        context.auth = this.authenticate(req);
      }

      const response = await match.handler(context);
      if (typeof this.store.whenIdle === "function") {
        await this.store.whenIdle();
      }
      if (!response) {
        sendJson(res, 204, null);
        return;
      }
      sendJson(res, response.status || 200, response.body ?? response);
    } catch (error) {
      const serialized = serializeError(error);
      sendJson(res, serialized.status, serialized.body);
    }
  }
}
