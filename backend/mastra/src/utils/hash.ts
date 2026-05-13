import { createHash, type Hash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const hashFile = async (filePath: string, hash: Hash): Promise<void> => {
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
};

export const getSha512OfString = (input: string): string => {
  return createHash("sha512").update(input).digest("hex");
};

export const getSha512OfFile = async (filePath: string): Promise<string> => {
  const hash = createHash("sha512");
  await hashFile(filePath, hash);
  return hash.digest("hex");
};

export const getSha512OfFolder = async (folderPath: string): Promise<string> => {
  const hash = createHash("sha512");
  const files: Array<string> = [];

  const collectFiles = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await collectFiles(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };

  await collectFiles(folderPath);
  files.sort();

  for (const file of files) {
    await hashFile(file, hash);
  }

  return hash.digest("hex");
};
