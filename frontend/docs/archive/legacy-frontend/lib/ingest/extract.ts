import { Readable } from "stream";
import { createGunzip } from "zlib";
import { Parser } from "tar";

export interface ExtractOptions {
  maxFileSize?: number;
  fileFilter?: (path: string) => boolean;
}

// Stream-extract a gzipped tarball buffer into a Map<string, Buffer>
// keyed by the *repo-relative* path (the leading "owner-repo-sha/" prefix
// that GitHub adds to its tarballs is stripped).
//
// Filtering happens during streaming so we never buffer files we don't
// care about. Files larger than maxFileSize are skipped.
export async function extractFiles(
  tarballBuffer: Buffer,
  opts: ExtractOptions = {},
): Promise<Map<string, Buffer>> {
  const maxFileSize = opts.maxFileSize ?? 2 * 1024 * 1024;
  const fileFilter = opts.fileFilter ?? (() => true);

  const files = new Map<string, Buffer>();

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser();

    // The tar Parser emits ReadEntry instances which extend Stream;
    // its types vary by version, so the entry handler accepts any.
    parser.on("entry", (entry: any) => {
      if (entry.type !== "File") {
        entry.resume();
        return;
      }
      const fullPath: string = entry.path;
      const idx = fullPath.indexOf("/");
      const repoPath = idx >= 0 ? fullPath.slice(idx + 1) : fullPath;

      if (!fileFilter(repoPath) || entry.size > maxFileSize) {
        entry.resume();
        return;
      }

      const chunks: Buffer[] = [];
      entry.on("data", (chunk: Buffer) => chunks.push(chunk));
      entry.on("end", () => {
        files.set(repoPath, Buffer.concat(chunks));
      });
      entry.on("error", reject);
    });

    parser.on("end", () => resolve());
    parser.on("error", reject);

    Readable.from([tarballBuffer]).pipe(createGunzip()).pipe(parser as any);
  });

  return files;
}
