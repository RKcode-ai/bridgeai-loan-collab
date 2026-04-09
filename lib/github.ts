import { chunkFiles, summarizeFileContent } from './chunking';
import { readRepoCache, writeRepoCache } from './cache';
import { RepoFile, RepoManifest } from './types';

const MAX_FILES = 220;
const MAX_FILE_SIZE = 180_000;
const IGNORED_FOLDERS = ['.git', 'node_modules', 'dist', 'build', 'coverage'];
const TEXT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'md', 'mdx', 'txt', 'yml', 'yaml', 'css', 'scss', 'html', 'py', 'java', 'go', 'rs',
  'sh', 'bash', 'sql', 'toml', 'xml'
]);

export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } {
  const parsed = new URL(url);
  if (!['github.com', 'www.github.com'].includes(parsed.hostname)) {
    throw new Error('Only github.com public repositories are supported.');
  }

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

function getExtension(path: string): string {
  const clean = path.split('/').pop() ?? path;
  const parts = clean.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function isIgnored(path: string): boolean {
  const segments = path.split('/');
  return segments.some((segment) => IGNORED_FOLDERS.includes(segment));
}

function looksBinary(path: string): boolean {
  const binaryExt = /\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|tar|jar|exe|dll|so|bin|woff2?|ttf|eot|mp4|mov|avi|wav|mp3|lock)$/i;
  return binaryExt.test(path);
}

function classifyFileType(path: string): RepoFile['fileType'] {
  const ext = getExtension(path);
  if (['md', 'mdx', 'txt'].includes(ext)) return 'doc';
  if (['json', 'yml', 'yaml', 'toml'].includes(ext)) return 'config';
  if (['csv', 'tsv'].includes(ext)) return 'data';
  if (TEXT_EXTENSIONS.has(ext)) return 'code';
  return 'other';
}

function classifyCategory(path: string): RepoFile['category'] {
  const p = path.toLowerCase();
  if (/(^|\/)(test|tests|__tests__|spec)(\/|$)|\.(spec|test)\./.test(p)) return 'test';
  if (/(^|\/)(components|ui|pages|app)(\/|$)|\.(tsx|jsx)$/.test(p)) return 'ui';
  if (/(^|\/)(lib|src|server|api|services?)(\/|$)|\.(ts|js|py|go|java|rs)$/.test(p)) return 'logic';
  return 'other';
}

async function fetchRepoFiles(owner: string, repo: string, branch: string): Promise<{ files: RepoFile[]; folders: string[] }> {
  type TreeResponse = { tree: Array<{ path: string; type: string; size?: number }> };
  const tree = await fetchJson<TreeResponse>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  const folders = tree.tree
    .filter((item) => item.type === 'tree' && !isIgnored(item.path))
    .map((item) => item.path)
    .sort();

  const targetPaths = tree.tree
    .filter((item) => item.type === 'blob')
    .filter((item) => !isIgnored(item.path))
    .filter((item) => !looksBinary(item.path))
    .filter((item) => (item.size ?? 0) > 0 && (item.size ?? 0) < MAX_FILE_SIZE)
    .slice(0, MAX_FILES)
    .map((item) => item.path);

  const files = await Promise.all(
    targetPaths.map(async (filePath) => {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const res = await fetch(rawUrl, { cache: 'no-store' });
      if (!res.ok) return null;

      const content = await res.text();
      if (content.includes('\u0000')) return null;

      const fileType = classifyFileType(filePath);
      const extension = getExtension(filePath);
      if (fileType === 'other' && !TEXT_EXTENSIONS.has(extension)) return null;

      return {
        path: filePath,
        size: content.length,
        content,
        extension,
        fileType,
        category: classifyCategory(filePath)
      } satisfies RepoFile;
    })
  );

  return {
    files: files.filter((file): file is RepoFile => Boolean(file)),
    folders
  };
}

function buildRepoSummary(owner: string, repo: string, branch: string, files: RepoFile[], repoDescription: string | null): string {
  const logic = files.filter((f) => f.category === 'logic').length;
  const ui = files.filter((f) => f.category === 'ui').length;
  const tests = files.filter((f) => f.category === 'test').length;
  const docs = files.filter((f) => f.fileType === 'doc').length;

  return [
    `${owner}/${repo} on branch ${branch} indexed ${files.length} files for retrieval.`,
    repoDescription ? `Repository description: ${repoDescription}.` : null,
    `Composition: ${logic} logic files, ${ui} UI files, ${tests} test files, ${docs} documentation files.`,
    `Only relevant chunks are passed to agents to keep context small and focused.`
  ]
    .filter(Boolean)
    .join(' ');
}

export async function buildRepoManifest(repoUrl: string): Promise<RepoManifest> {
  const cacheKey = `repo:${repoUrl}`;
  const existing = await readRepoCache<RepoManifest>(cacheKey);
  if (existing) return existing;

  const { owner, repo } = parseGitHubRepoUrl(repoUrl);
  type RepoResponse = { default_branch: string; description: string | null };
  const repoMeta = await fetchJson<RepoResponse>(`https://api.github.com/repos/${owner}/${repo}`);
  const branch = repoMeta.default_branch || 'main';

  const { files, folders } = await fetchRepoFiles(owner, repo, branch);
  const chunks = chunkFiles(files);

  const fileSummaries = files.map((file) => ({
    path: file.path,
    size: file.size,
    extension: file.extension,
    fileType: file.fileType,
    category: file.category,
    summary: summarizeFileContent(file.path, file.content, file.fileType)
  }));

  const likelyLogicFiles = fileSummaries.filter((file) => file.category === 'logic').map((file) => file.path).slice(0, 25);
  const likelyUiFiles = fileSummaries.filter((file) => file.category === 'ui').map((file) => file.path).slice(0, 25);
  const likelyTests = fileSummaries.filter((file) => file.category === 'test').map((file) => file.path).slice(0, 25);

  const summary = buildRepoSummary(owner, repo, branch, files, repoMeta.description);

  const manifest: RepoManifest = {
    repoUrl,
    owner,
    repo,
    branch,
    indexedAt: new Date().toISOString(),
    summary,
    folders,
    files: fileSummaries,
    likelyLogicFiles,
    likelyUiFiles,
    likelyTests,
    chunks
  };

  await writeRepoCache(cacheKey, manifest);
  return manifest;
}
