import { RepoChunk, RepoManifest, RetrievedEvidence } from './types';

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function tokenScore(text: string, tokens: string[]): number {
  const haystack = text.toLowerCase();
  return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

function scoreChunk(chunk: RepoChunk, requirementTokens: string[], seedBoost = 0): number {
  const localScore = tokenScore(`${chunk.path} ${chunk.text}`, requirementTokens);
  return localScore + seedBoost + (chunk.chunkType === 'code' ? 1 : 0);
}

export function retrieveRelevantChunks(manifest: RepoManifest, requirement: string, limit = 8): RetrievedEvidence {
  const tokens = tokenize(requirement);

  const topFiles = manifest.files
    .map((file) => ({
      path: file.path,
      summary: file.summary,
      score: tokenScore(`${file.path} ${file.summary}`, tokens) + (file.category === 'logic' ? 2 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const topFileSet = new Set(topFiles.map((file) => file.path));

  const rankedChunks = manifest.chunks
    .map((chunk) => {
      const boost = topFileSet.has(chunk.path) ? 3 : 0;
      return { chunk, score: scoreChunk(chunk, tokens, boost) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);

  const topPaths = [...new Set(rankedChunks.map((chunk) => chunk.path))].slice(0, 8);

  return {
    chunks: rankedChunks,
    topPaths,
    matchedFileSummaries: topFiles.slice(0, 8)
  };
}
