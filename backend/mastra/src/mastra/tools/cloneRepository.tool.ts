import { createTool } from "@mastra/core/tools";
import { execSync } from "child_process";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import z from "zod";

function parseRepoUrl(url: string) {
  const clean = url.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = clean.split("/");
  const repo = parts.pop()!;
  const owner = parts.pop()!;
  return { owner, repo };
}

export const cloneRepositoryTool = createTool({
  id: "clone-repository",
  description: "Clone a GitHub repository to a local directory and return the basepath. Only supports public repos.",
  inputSchema: z.object({
    url: z.string().describe("GitHub repository URL (e.g. https://github.com/owner/repo)"),
  }),
  outputSchema: z.object({
    basepath: z.string().describe("Local path to the cloned repository"),
    repoName: z.string().describe("Name of the repository"),
  }),
  execute: async ({ url }) => {
    const { owner, repo } = parseRepoUrl(url);
    const cloneDir = join(homedir(), "brim_codebase_visualizer", "repos", owner, repo);
    const parentDir = join(cloneDir, "..");

    if (existsSync(cloneDir)) {
      rmSync(cloneDir, { recursive: true, force: true });
    }
    mkdirSync(parentDir, { recursive: true });

    console.log(`Cloning ${url} into ${cloneDir}...`);
    execSync(`git clone --depth 1 "${url}" "${cloneDir}"`, { timeout: 120_000 });

    return { basepath: cloneDir, repoName: repo };
  },
});
