import fs from "fs/promises";
import path from "path";
import type { Codebase } from "@/lib/codebase/types";

const CACHE_ROOT = path.join(process.cwd(), ".cache", "ingest");

function repoDir(owner: string, repo: string): string {
  return path.join(CACHE_ROOT, owner, repo);
}

export async function readCache(owner: string, repo: string): Promise<Codebase | null> {
  const file = path.join(repoDir(owner, repo), "graph.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as Codebase;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeCache(owner: string, repo: string, codebase: Codebase): Promise<void> {
  const dir = repoDir(owner, repo);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "graph.json"),
    JSON.stringify(codebase),
    "utf8"
  );
}
