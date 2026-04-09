import { chunkFiles, summarizeFileContent } from './chunking';
import { readRepoCache, writeRepoCache } from './cache';
import { RepoFile, RepoManifest } from './types';

const MAX_FILES = 40;
const MAX_FILE_SIZE = 60_000;

function stripGitHubUrl(url: string): { owner: string; repo: string } {
  const parsed = new URL(url);
  const parts = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('Repository URL must include owner and repository name.');
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BridgeAI-MVP',
      Accept: 'application/vnd.github+json'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`GitHub request failed (${res.status}) for ${url}`);
  }

  return (await res.json()) as T;
}

function isTextFile(path: string): boolean {
  return /\.(ts|tsx|js|jsx|json|md|txt|yml|yaml|css|html|py|java|go|rs|sh)$/i.test(path);
}

async function fetchRepoFiles(owner: string, repo: string, branch: string): Promise<RepoFile[]> {
  type TreeResponse = { tree: Array<{ path: string; type: string; size?: number }> };
  const tree = await fetchJson<TreeResponse>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  const targetPaths = tree.tree
    .filter((item) => item.type === 'blob' && (item.size ?? 0) < MAX_FILE_SIZE && isTextFile(item.path))
    .slice(0, MAX_FILES)
    .map((item) => item.path);

  const files = await Promise.all(
    targetPaths.map(async (filePath) => {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const res = await fetch(rawUrl, { cache: 'no-store' });
      if (!res.ok) {
        return null;
      }
      const content = await res.text();
      return { path: filePath, size: content.length, content };
    })
  );

  return files.filter((file): file is RepoFile => Boolean(file));
}

export async function buildRepoManifest(repoUrl: string): Promise<RepoManifest> {
  const cacheKey = `repo:${repoUrl}`;
  const existing = await readRepoCache<RepoManifest>(cacheKey);
  if (existing) return existing;

  const { owner, repo } = stripGitHubUrl(repoUrl);
  type RepoResponse = { default_branch: string; description: string | null };
  const repoMeta = await fetchJson<RepoResponse>(`https://api.github.com/repos/${owner}/${repo}`);
  const branch = repoMeta.default_branch || 'main';

  const files = await fetchRepoFiles(owner, repo, branch);
  const chunks = chunkFiles(files);

  const fileSummaries = files.map((file) => ({
    path: file.path,
    size: file.size,
    summary: summarizeFileContent(file.path, file.content)
  }));

  const summary = [
    `BridgeAI indexed ${files.length} text files from ${owner}/${repo} (${branch}).`,
    repoMeta.description ? `Repository description: ${repoMeta.description}` : null,
    `Most visible files: ${fileSummaries.slice(0, 8).map((f) => f.path).join(', ')}`
  ]
    .filter(Boolean)
    .join(' ');

  const manifest: RepoManifest = {
    repoUrl,
    owner,
    repo,
    branch,
    indexedAt: new Date().toISOString(),
    summary,
    files: fileSummaries,
    chunks
  };

  await writeRepoCache(cacheKey, manifest);
  return manifest;
}
