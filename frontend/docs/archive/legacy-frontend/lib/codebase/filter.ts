// View-time filter: produce a derived codebase with hidden folders
// (and their files / edges) removed. IDs are renumbered so the result
// is a fully self-consistent codebase shape, indistinguishable from
// what ingestion would have produced for the smaller set.

import type { Codebase, CodebaseFile, Folder, FolderKind } from "./types";

export interface FilterOptions {
  hideTests?: boolean;
}

const HIDDEN_FOR: Record<keyof FilterOptions, ReadonlySet<FolderKind>> = {
  hideTests: new Set(["test"]),
};

export function applyFilter(codebase: Codebase, opts: FilterOptions = {}): Codebase {
  const hidden = new Set<FolderKind>();
  if (opts.hideTests) HIDDEN_FOR.hideTests.forEach((k) => hidden.add(k));
  if (hidden.size === 0) return codebase;

  const visibleFolders = codebase.folders.filter((f) => !hidden.has(f.kind));
  if (visibleFolders.length === codebase.folders.length) return codebase;

  const folderIdMap = new Map<number, number>();
  const folders: Folder[] = visibleFolders.map((f, idx) => {
    folderIdMap.set(f.id, idx);
    return { ...f, id: idx, files: [] };
  });

  const fileIdMap = new Map<number, number>();
  const allFiles: CodebaseFile[] = [];
  visibleFolders.forEach((origFolder, fi) => {
    const newFolder = folders[fi];
    origFolder.files.forEach((file) => {
      const newId = allFiles.length;
      fileIdMap.set(file.id, newId);
      const newFile: CodebaseFile = {
        ...file,
        id: newId,
        folderId: newFolder.id,
        imports: [],
        importedBy: [],
      };
      newFolder.files.push(newFile);
      allFiles.push(newFile);
    });
  });

  // Rewire imports/importedBy to the new IDs (drop refs to filtered files).
  visibleFolders.forEach((origFolder) => {
    origFolder.files.forEach((origFile) => {
      const newId = fileIdMap.get(origFile.id);
      if (newId === undefined) return;
      const newFile = allFiles[newId];
      newFile.imports = origFile.imports
        .map((id) => fileIdMap.get(id))
        .filter((id): id is number => id !== undefined);
      newFile.importedBy = origFile.importedBy
        .map((id) => fileIdMap.get(id))
        .filter((id): id is number => id !== undefined);
    });
  });

  const folderEdges = codebase.folderEdges
    .filter((e) => folderIdMap.has(e.source) && folderIdMap.has(e.target))
    .map((e) => ({
      ...e,
      source: folderIdMap.get(e.source)!,
      target: folderIdMap.get(e.target)!,
    }));

  return {
    ...codebase,
    folders,
    allFiles,
    folderEdges,
    readme: codebase.readme,
  };
}

export function hasTestFolders(codebase: Codebase): boolean {
  return codebase.folders.some((f) => f.kind === "test");
}
