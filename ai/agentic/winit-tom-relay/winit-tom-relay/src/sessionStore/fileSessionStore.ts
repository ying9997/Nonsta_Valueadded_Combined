import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionStore } from "./types.js";

type Envelope = { readonly exp: number; readonly v: string };

function keyToFilename(logicalKey: string): string {
  return createHash("sha256").update(logicalKey, "utf8").digest("hex");
}

export async function ensureSessionStoreBaseDir(baseDir: string): Promise<void> {
  await mkdir(join(baseDir, "entries"), { recursive: true });
}

export class FileSessionStore implements SessionStore {
  private readonly entriesDir: string;

  constructor(baseDir: string) {
    this.entriesDir = join(baseDir, "entries");
  }

  private pathForKey(logicalKey: string): string {
    return join(this.entriesDir, keyToFilename(logicalKey));
  }

  async get(logicalKey: string): Promise<string | null> {
    const p = this.pathForKey(logicalKey);
    let raw: string;
    try {
      raw = await readFile(p, "utf8");
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw e;
    }
    let env: Envelope;
    try {
      env = JSON.parse(raw) as Envelope;
    } catch {
      await this.safeUnlink(p);
      return null;
    }
    if (typeof env.exp !== "number" || typeof env.v !== "string") {
      await this.safeUnlink(p);
      return null;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec >= env.exp) {
      await this.safeUnlink(p);
      return null;
    }
    return env.v;
  }

  async setWithTtl(logicalKey: string, value: string, ttlSec: number): Promise<void> {
    const exp = Math.floor(Date.now() / 1000) + Math.max(0, Math.floor(ttlSec));
    const finalPath = this.pathForKey(logicalKey);
    const tmpName = `.tmp-${randomBytes(16).toString("hex")}`;
    const tmpPath = join(this.entriesDir, tmpName);
    const body = JSON.stringify({ exp, v: value } satisfies Envelope);
    await writeFile(tmpPath, body, "utf8");
    await rename(tmpPath, finalPath);
  }

  async del(logicalKey: string): Promise<void> {
    await this.safeUnlink(this.pathForKey(logicalKey));
  }

  private async safeUnlink(p: string): Promise<void> {
    try {
      await unlink(p);
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw e;
    }
  }
}
