import { RepoChunk, RepoFile } from './types';

const MAX_CHUNK_LINES = 80;

export function chunkFiles(files: RepoFile[]): RepoChunk[] {
  const chunks: RepoChunk[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i += MAX_CHUNK_LINES) {
      const slice = lines.slice(i, i + MAX_CHUNK_LINES);
      const startLine = i + 1;
      const endLine = Math.min(i + MAX_CHUNK_LINES, lines.length);
      const text = slice.join('\n').trim();
      if (!text) continue;

      chunks.push({
        id: `${file.path}:${startLine}-${endLine}`,
        path: file.path,
        startLine,
        endLine,
        text
      });
    }
  }

  return chunks;
}

export function summarizeFileContent(path: string, content: string): string {
  const lines = content.split('\n').slice(0, 12).join(' ').replace(/\s+/g, ' ').trim();
  return `${path} contains ${content.split('\n').length} lines. Preview: ${lines.slice(0, 220)}`;
}
