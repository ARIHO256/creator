import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildSeedData } from "../seed/buildSeedData.js";

export class JsonStore {
  constructor(filePath) {
    this.filePath = resolve(filePath);
    this.cache = null;
  }

  ensure() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    if (!existsSync(this.filePath)) {
      writeFileSync(this.filePath, JSON.stringify(buildSeedData(), null, 2));
    }
  }

  load() {
    this.ensure();
    if (!this.cache) {
      this.cache = JSON.parse(readFileSync(this.filePath, "utf8"));
    }
    return this.cache;
  }

  snapshot() {
    return structuredClone(this.load());
  }

  save() {
    this.ensure();
    writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  update(mutator) {
    const db = this.load();
    const result = mutator(db);
    db.meta.updatedAt = new Date().toISOString();
    this.save();
    return structuredClone(result);
  }
}
