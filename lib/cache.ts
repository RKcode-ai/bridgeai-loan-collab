import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

const PRIMARY_CACHE_DIR = path.join(process.cwd(), '.cache', 'repos');
const FALLBACK_CACHE_DIR = path.join(os.tmpdir(), 'bridgeai-cache', 'repos');

function keyToFileName(key: string): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return `${hash}.json`;
}

export async function writeRepoCache<T>(key: string, value: T): Promise<void> {
  const fileName = keyToFileName(key);

  try {
    const payload = JSON.stringify(value, null, 2);
    await mkdir(PRIMARY_CACHE_DIR, { recursive: true });
    await writeFile(path.join(PRIMARY_CACHE_DIR, fileName), payload, 'utf-8');
  } catch (error) {
    try {
      const payload = JSON.stringify(value, null, 2);
      await mkdir(FALLBACK_CACHE_DIR, { recursive: true });
      await writeFile(path.join(FALLBACK_CACHE_DIR, fileName), payload, 'utf-8');
    } catch (fallbackError) {
      console.warn('[cache] Failed to persist repository cache. Continuing without local cache.', {
        primaryError: error,
        fallbackError
      });
    }
  }
}

export async function readRepoCache<T>(key: string): Promise<T | null> {
  const fileName = keyToFileName(key);

  try {
    const raw = await readFile(path.join(PRIMARY_CACHE_DIR, fileName), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    try {
      const raw = await readFile(path.join(FALLBACK_CACHE_DIR, fileName), 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
