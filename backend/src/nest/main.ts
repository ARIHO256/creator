import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { Request, Response } from "express";
import { AppModule } from "./app.module.js";
import { createApp as createLegacyApp } from "../server.js";

const DEFAULT_PORT = Number(process.env.PORT || "4010");
const DEFAULT_HOST = process.env.HOST || "127.0.0.1";
const DEFAULT_DB_FILE = process.env.MLDZ_DB_FILE || "./src/data/db.json";

async function bootstrap() {
  // Keep body parser disabled so the legacy router can parse request streams itself.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const legacy = createLegacyApp({ port: 0, host: DEFAULT_HOST, dbFile: DEFAULT_DB_FILE });

  app.use((req: Request, res: Response) => {
    void legacy.router.handle(req, res);
  });

  await app.listen(DEFAULT_PORT, DEFAULT_HOST);
  console.log(`MyLiveDealz Creator backend (Nest + Express) listening on http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  console.log("Seed login: creator@mylivedealz.com / Password123!");
}

bootstrap().catch((error) => {
  console.error("Failed to start Nest backend:", error);
  process.exit(1);
});
