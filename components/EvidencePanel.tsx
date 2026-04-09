import { RetrievedEvidence } from '@/lib/types';

export function EvidencePanel({ evidence }: { evidence: RetrievedEvidence | null }) {
  return (
    <section className="card">
      <h3 className="text-lg font-semibold">Evidence / Traceability</h3>
      <p className="mt-1 text-sm text-slate-300">
        BridgeAI retrieves only relevant repository chunks instead of sending the entire repo on each prompt.
      </p>

      {!evidence ? (
        <p className="mt-4 text-sm text-slate-400">Index a repository and run analysis to see traceability evidence.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {evidence.topPaths.map((path) => (
              <span key={path} className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                {path}
              </span>
            ))}
          </div>
          <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
            {evidence.chunks.map((chunk) => (
              <article key={chunk.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                <div className="mb-2 text-xs text-blue-300">
                  {chunk.path} ({chunk.startLine}-{chunk.endLine})
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-200">{chunk.text.slice(0, 480)}</pre>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
