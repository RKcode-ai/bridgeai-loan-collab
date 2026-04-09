'use client';

import { useMemo, useState } from 'react';
import { AgentPanel } from '@/components/AgentPanel';
import { EvidencePanel } from '@/components/EvidencePanel';
import { BusinessAgentOutput, EngineeringAgentOutput, RetrievedEvidence } from '@/lib/types';

const SAMPLE_REQUIREMENT =
  'Add a loan term calculation feature to the loan calculator';

type RepoIndexSummary = {
  summary: string;
  filesCount: number;
  folderCount: number;
  chunksCount: number;
  branch: string;
  owner: string;
  repo: string;
  indexedAt: string;
  likelyLogicFiles: string[];
  likelyUiFiles: string[];
  likelyTests: string[];
};

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-medium text-blue-300">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-200">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/microsoft/loan-calculator');
  const [requirement, setRequirement] = useState(SAMPLE_REQUIREMENT);
  const [repoInfo, setRepoInfo] = useState<RepoIndexSummary | null>(null);
  const [business, setBusiness] = useState<BusinessAgentOutput | null>(null);
  const [engineering, setEngineering] = useState<EngineeringAgentOutput | null>(null);
  const [evidence, setEvidence] = useState<RetrievedEvidence | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [engineeringLoading, setEngineeringLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const indexedBadge = useMemo(() => {
    if (!repoInfo) return 'Not indexed';
    return `${repoInfo.owner}/${repoInfo.repo} (${repoInfo.branch}) · ${repoInfo.filesCount} files · ${repoInfo.chunksCount} chunks`;
  }, [repoInfo]);

  async function onIndexRepo() {
    setError(null);
    setIndexing(true);

    try {
      const res = await fetch('/api/index-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to index repo');
      setRepoInfo(data.manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to index repo');
    } finally {
      setIndexing(false);
    }
  }

  async function onRunBusinessAgent() {
    setError(null);
    setBusinessLoading(true);

    try {
      const res = await fetch('/api/business-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, requirement })
      });
      const data = (await res.json()) as { ok: boolean; error?: string; business?: BusinessAgentOutput };
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to run Business Agent');

      setBusiness(data.business ?? null);

      if (!repoInfo) {
        await onIndexRepo();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Business Agent');
    } finally {
      setBusinessLoading(false);
    }
  }

  async function onRunEngineeringAgent() {
    if (!business?.handoff_brief) {
      setError('Run Business Agent first so Engineering Agent receives the handoff brief.');
      return;
    }

    setError(null);
    setEngineeringLoading(true);

    try {
      const res = await fetch('/api/engineering-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          requirement,
          handoff_brief: business.handoff_brief
        })
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        engineering?: EngineeringAgentOutput;
        evidence?: RetrievedEvidence;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to run Engineering Agent');

      setEngineering(data.engineering ?? null);
      setEvidence(data.evidence ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Engineering Agent');
    } finally {
      setEngineeringLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6">
      <section className="mb-8 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 to-blue-950/70 p-6">
        <p className="mb-3 inline-block rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
          Hackathon MVP · Loan Calculator Collaboration
        </p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">BridgeAI</h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          BridgeAI helps business experts and software engineers collaborate on a public loan calculator repository. Index the repo once,
          submit a requirement, and get dual-agent outputs plus code evidence traceability.
        </p>
      </section>

      <section className="card mb-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Public GitHub repository URL</label>
            <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="input" />
            <p className="mt-2 text-xs text-slate-400">Status: {indexing ? 'Indexing repository…' : indexedBadge}</p>
            {repoInfo ? (
              <>
                <p className="mt-1 text-xs text-slate-400">Indexed at {new Date(repoInfo.indexedAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-300">{repoInfo.summary}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Indexed folders: {repoInfo.folderCount} · Logic candidates: {repoInfo.likelyLogicFiles.length} · UI candidates:{' '}
                  {repoInfo.likelyUiFiles.length} · Tests: {repoInfo.likelyTests.length}
                </p>
              </>
            ) : null}
          </div>
          <button className="btn-primary h-10 self-end" disabled={indexing} onClick={onIndexRepo}>
            {indexing ? 'Indexing…' : 'Index Repo'}
          </button>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">Business requirement</label>
            <button className="btn-secondary" onClick={() => setRequirement(SAMPLE_REQUIREMENT)}>
              Use sample requirement
            </button>
          </div>
          <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} className="input min-h-28" />
          <div className="mt-3">
            <button className="btn-primary mr-3" disabled={businessLoading} onClick={onRunBusinessAgent}>
              {businessLoading ? 'Generating…' : 'Run Business Agent'}
            </button>
            <button className="btn-secondary" disabled={engineeringLoading || !business} onClick={onRunEngineeringAgent}>
              {engineeringLoading ? 'Generating…' : 'Run Engineering Agent'}
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AgentPanel title="Business Agent" subtitle="Business-ready requirement brief" loading={businessLoading && !business}>
          {!business ? (
            <p className="text-sm text-slate-400">No output yet. Run the Business Agent to transform the requirement into a polished delivery brief.</p>
          ) : (
            <div className="space-y-4 rounded-xl border border-blue-400/20 bg-gradient-to-b from-blue-950/40 to-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Feature Name</p>
                  <p className="mt-1 text-base font-semibold text-white">{business.feature_name}</p>
                </div>
                <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                  Demo Ready
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Business Goal</p>
                  <p className="mt-1 text-slate-100">{business.business_goal}</p>
                </div>
                <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">User Story</p>
                  <p className="mt-1 text-slate-100">{business.user_story}</p>
                </div>
              </div>

              <SectionList title="Acceptance criteria" items={business.acceptance_criteria} />
              <SectionList title="Assumptions" items={business.assumptions} />
              <SectionList title="Edge cases" items={business.edge_cases} />
              <SectionList title="Open questions" items={business.open_questions} />

              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Engineering handoff brief</p>
                <p className="mt-1 text-slate-100">{business.handoff_brief}</p>
              </div>
            </div>
          )}
        </AgentPanel>

        <AgentPanel title="Engineering Agent" subtitle="Repository-grounded technical plan" loading={engineeringLoading && !engineering}>
          {!engineering ? (
            <p className="text-sm text-slate-400">No output yet. Run Engineering Agent after business handoff to produce a technical implementation plan.</p>
          ) : (
            <>
              <p><strong>Current system:</strong> {engineering.current_system_summary}</p>
              <div>
                <h4 className="font-medium text-blue-300">Impacted files (from retrieved evidence)</h4>
                <ul className="mt-2 space-y-2">
                  {engineering.impacted_files.map((file, idx) => (
                    <li key={`${file.path}-${idx}`} className="rounded-md border border-blue-400/30 bg-slate-900/80 p-3 text-sm">
                      <div className="font-mono text-xs text-blue-200">{file.path}</div>
                      <div className="mt-1 text-slate-200">{file.why}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <SectionList title="Implementation plan" items={engineering.implementation_plan} />
              <SectionList title="Test plan" items={engineering.test_plan} />
              <SectionList title="Risks" items={engineering.risks} />
              <p><strong>Business explanation:</strong> {engineering.business_explanation}</p>
            </>
          )}
        </AgentPanel>
      </section>

      <div className="mt-6">
        <EvidencePanel evidence={evidence} requirement={requirement} handoffBrief={business?.handoff_brief ?? null} engineeringPlan={engineering?.implementation_plan ?? []} />
      </div>
    </main>
  );
}
