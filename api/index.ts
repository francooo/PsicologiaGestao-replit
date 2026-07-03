import 'dotenv/config';
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import { createApp } from "../server/app";

let appPromise: Promise<{ app: Express }> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { app } = await getApp();
  return app(req as any, res as any);
}
