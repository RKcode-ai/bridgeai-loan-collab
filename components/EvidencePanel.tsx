import { RetrievedEvidence } from '@/lib/types';

type EvidencePanelProps = {
  evidence: RetrievedEvidence | null;
  requirement: string;
  handoffBrief: string | null;
  engineeringPlan: string[];
};

export function EvidencePanel({ evidence, requirement, handoffBrief, engineeringPlan }: EvidencePanelProps) {
  return (
    <section className="card">
      <h3 className="text-lg font-semibold">Evidence / Traceability</h3>
      <p className="mt-1 text-sm text-slate-300">
        BridgeAI uses hierarchical retrieval (repo summary → file summaries → chunks) so only relevant context is sent per request.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">1) Requirement</p>
          <p className="mt-2 text-xs text-slate-200">{requirement}</p>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">2) Business handoff</p>
          <p className="mt-2 text-xs text-slate-200">{handoffBrief || 'Run Business Agent to populate handoff brief.'}</p>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">3) Repo evidence</p>
          <p className="mt-2 text-xs text-slate-200">
            {evidence ? `${evidence.chunks.length} ranked chunks across ${evidence.topPaths.length} files retrieved.` : 'Run Engineering Agent to retrieve evidence.'}
          </p>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">4) Engineering plan</p>
          <p className="mt-2 text-xs text-slate-200">
            {engineeringPlan.length ? engineeringPlan[0] : 'Run Engineering Agent to generate implementation steps.'}
          </p>
        </article>
      </div>

      {!evidence ? (
        <p className="mt-4 text-sm text-slate-400">Index a repository and run analysis to see traceability evidence.</p>
      ) : (
        <>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-blue-300">Top matching files</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {evidence.topPaths.map((path) => (
                <span key={path} className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                  {path}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-blue-300">Matched file summaries</h4>
            {evidence.matchedFileSummaries.map((file) => (
              <article key={file.path} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
                <div className="mb-1 font-mono text-blue-300">{file.path} · score {file.score}</div>
                <div>{file.summary}</div>
              </article>
            ))}
          </div>

          <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
            {evidence.chunks.map((chunk) => (
              <article key={chunk.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                <div className="mb-2 text-xs text-blue-300">
                  {chunk.path} ({chunk.startLine}-{chunk.endLine}) · {chunk.chunkType}
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
