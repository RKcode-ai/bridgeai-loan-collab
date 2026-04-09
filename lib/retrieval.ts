import { RepoChunk, RetrievedEvidence } from './types';

function scoreChunk(chunk: RepoChunk, requirement: string): number {
  const tokens = requirement
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const haystack = `${chunk.path} ${chunk.text}`.toLowerCase();
  return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

export function retrieveRelevantChunks(chunks: RepoChunk[], requirement: string, limit = 8): RetrievedEvidence {
  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, requirement) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);

  const topPaths = [...new Set(ranked.map((chunk) => chunk.path))].slice(0, 8);
  return { chunks: ranked, topPaths };
}
