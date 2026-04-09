import { RepoChunk, RepoFile } from './types';

const CODE_CHUNK_LINES = 70;
const DOC_CHUNK_LINES = 120;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkFiles(files: RepoFile[]): RepoChunk[] {
  const chunks: RepoChunk[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    const chunkSize = file.fileType === 'doc' ? DOC_CHUNK_LINES : CODE_CHUNK_LINES;
    const chunkType = file.fileType === 'doc' ? 'doc' : 'code';

    for (let i = 0; i < lines.length; i += chunkSize) {
      const slice = lines.slice(i, i + chunkSize);
      const startLine = i + 1;
      const endLine = Math.min(i + chunkSize, lines.length);
      const text = slice.join('\n').trim();
      if (!text) continue;

      chunks.push({
        id: `${file.path}:${startLine}-${endLine}`,
        path: file.path,
        startLine,
        endLine,
        text,
        chunkType,
        tokensHint: estimateTokens(text)
      });
    }
  }

  return chunks;
}

export function summarizeFileContent(path: string, content: string, fileType: RepoFile['fileType']): string {
  const lineCount = content.split('\n').length;
  const preview = content
    .split('\n')
    .slice(0, fileType === 'doc' ? 20 : 10)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);

  return `${path} is a ${fileType} file with ${lineCount} lines. Preview: ${preview}`;
}
