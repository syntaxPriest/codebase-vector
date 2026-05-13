import { open } from 'lmdb';
import { homedir } from 'os';
import path, { join } from 'path';

const db = open(join(homedir(), "brim_codebase_visualizer", "/.cache/lmdb"), { compression : true });

export function getCache() {
  return db;
}
