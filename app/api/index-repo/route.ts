import { NextResponse } from 'next/server';
import { buildRepoManifest } from '@/lib/github';
import { indexRepoRequestSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = indexRepoRequestSchema.parse(body);

    const manifest = await buildRepoManifest(parsed.repoUrl);

    return NextResponse.json({
      ok: true,
      manifest: {
        repoUrl: manifest.repoUrl,
        owner: manifest.owner,
        repo: manifest.repo,
        branch: manifest.branch,
        indexedAt: manifest.indexedAt,
        summary: manifest.summary,
        filesCount: manifest.files.length,
        folderCount: manifest.folders.length,
        chunksCount: manifest.chunks.length,
        likelyLogicFiles: manifest.likelyLogicFiles.slice(0, 8),
        likelyUiFiles: manifest.likelyUiFiles.slice(0, 8),
        likelyTests: manifest.likelyTests.slice(0, 8),
        topFiles: manifest.files.slice(0, 10)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to index repository.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
