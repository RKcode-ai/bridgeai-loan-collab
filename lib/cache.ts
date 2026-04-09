import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'repos');

function keyToFileName(key: string): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return `${hash}.json`;
}

export async function writeRepoCache<T>(key: string, value: T): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, keyToFileName(key)), JSON.stringify(value, null, 2), 'utf-8');
  } catch (error) {
    console.warn('[cache] Failed to persist repository cache. Continuing without local cache.', error);
  }
}

export async function readRepoCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(CACHE_DIR, keyToFileName(key)), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
