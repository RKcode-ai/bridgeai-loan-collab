'use client';

import { useMemo, useState } from 'react';
import { AgentPanel } from '@/components/AgentPanel';
import { EvidencePanel } from '@/components/EvidencePanel';
import { AnalyzeResponse, BusinessAgentOutput, EngineeringAgentOutput, RetrievedEvidence } from '@/lib/types';

const SAMPLE_REQUIREMENT =
  'Add support for a promotional rule where users selecting a 36-month term with credit score above 740 receive a 0.5% reduced interest rate, while keeping monthly payment calculation transparent.';

type RepoIndexSummary = {
  summary: string;
  filesCount: number;
  chunksCount: number;
  branch: string;
  owner: string;
  repo: string;
  indexedAt: string;
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
  const [analyzing, setAnalyzing] = useState(false);
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

  async function onAnalyze() {
    setError(null);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, requirement })
      });
      const data = (await res.json()) as ({ ok: boolean; error?: string } & Partial<AnalyzeResponse>);
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to analyze requirement');

      setBusiness(data.business ?? null);
      setEngineering(data.engineering ?? null);
      setEvidence(data.evidence ?? null);

      if (!repoInfo) {
        await onIndexRepo();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze requirement');
    } finally {
      setAnalyzing(false);
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
            <p className="mt-2 text-xs text-slate-400">Status: {indexedBadge}</p>
            {repoInfo ? <p className="mt-1 text-xs text-slate-400">Indexed at {new Date(repoInfo.indexedAt).toLocaleString()}</p> : null}
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
            <button className="btn-primary" disabled={analyzing} onClick={onAnalyze}>
              {analyzing ? 'Analyzing…' : 'Run Business + Engineering Agents'}
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AgentPanel title="Business Agent" subtitle="Requirement breakdown for stakeholders" loading={analyzing && !business}>
          {!business ? (
            <p className="text-sm text-slate-400">No output yet. Run analysis to generate a business-aligned implementation brief.</p>
          ) : (
            <>
              <p><strong>Feature:</strong> {business.feature_name}</p>
              <p><strong>Goal:</strong> {business.business_goal}</p>
              <p><strong>User story:</strong> {business.user_story}</p>
              <SectionList title="Acceptance criteria" items={business.acceptance_criteria} />
              <SectionList title="Assumptions" items={business.assumptions} />
              <SectionList title="Edge cases" items={business.edge_cases} />
              <SectionList title="Open questions" items={business.open_questions} />
              <p><strong>Engineering handoff:</strong> {business.handoff_brief}</p>
            </>
          )}
        </AgentPanel>

        <AgentPanel title="Engineering Agent" subtitle="Repository-grounded technical plan" loading={analyzing && !engineering}>
          {!engineering ? (
            <p className="text-sm text-slate-400">No output yet. Run analysis to produce a technical implementation plan.</p>
          ) : (
            <>
              <p><strong>Current system:</strong> {engineering.current_system_summary}</p>
              <div>
                <h4 className="font-medium text-blue-300">Impacted files</h4>
                <ul className="mt-1 space-y-2">
                  {engineering.impacted_files.map((file, idx) => (
                    <li key={`${file.path}-${idx}`} className="rounded-md border border-slate-700 bg-slate-900/70 p-2 text-sm">
                      <div className="font-mono text-xs text-blue-200">{file.path}</div>
                      <div className="text-slate-200">{file.why}</div>
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
        <EvidencePanel evidence={evidence} />
      </div>
    </main>
  );
}
