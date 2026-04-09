'use client';

import { useMemo, useState } from 'react';
import { AgentPanel } from '@/components/AgentPanel';
import { EvidencePanel } from '@/components/EvidencePanel';
import { BusinessAgentOutput, EngineeringAgentOutput, RetrievedEvidence } from '@/lib/types';

const SAMPLE_REPO = 'https://github.com/microsoft/loan-calculator';
const SAMPLE_REQUIREMENT =
  'Add a loan term calculation feature that compares 12, 24, and 36 month options, highlights the lowest total cost, and explains monthly payment tradeoffs in plain language.';

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

type IndexResponse = {
  ok: boolean;
  error?: string;
  cache?: 'refreshed' | 'cached-or-new';
  manifest?: RepoIndexSummary;
};

type BusyState = {
  index: boolean;
  business: boolean;
  engineering: boolean;
  demo: boolean;
};

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return (
      <div>
        <h4 className="font-medium text-blue-300">{title}</h4>
        <p className="mt-1 text-sm text-slate-400">No items returned.</p>
      </div>
    );
  }

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
  const [repoUrl, setRepoUrl] = useState(SAMPLE_REPO);
  const [requirement, setRequirement] = useState(SAMPLE_REQUIREMENT);
  const [repoInfo, setRepoInfo] = useState<RepoIndexSummary | null>(null);
  const [business, setBusiness] = useState<BusinessAgentOutput | null>(null);
  const [engineering, setEngineering] = useState<EngineeringAgentOutput | null>(null);
  const [evidence, setEvidence] = useState<RetrievedEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexMode, setIndexMode] = useState<'refreshed' | 'cached-or-new' | null>(null);
  const [busy, setBusy] = useState<BusyState>({
    index: false,
    business: false,
    engineering: false,
    demo: false
  });

  const indexedBadge = useMemo(() => {
    if (!repoInfo) return 'Not indexed';
    return `${repoInfo.owner}/${repoInfo.repo} (${repoInfo.branch}) · ${repoInfo.filesCount} files · ${repoInfo.chunksCount} chunks`;
  }, [repoInfo]);

  const canRun = requirement.trim().length >= 10 && repoUrl.trim().length > 0;

  async function indexRepo(url: string, forceRefresh = false): Promise<RepoIndexSummary> {
    const res = await fetch('/api/index-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: url, forceRefresh })
    });

    const data = (await res.json()) as IndexResponse;
    if (!res.ok || !data.ok || !data.manifest) {
      throw new Error(data.error || 'Failed to index repository');
    }

    setIndexMode(data.cache ?? null);
    setRepoInfo(data.manifest);
    return data.manifest;
  }

  async function runBusiness(url: string, rawRequirement: string): Promise<BusinessAgentOutput> {
    const res = await fetch('/api/business-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: url, requirement: rawRequirement })
    });

    const data = (await res.json()) as { ok: boolean; error?: string; business?: BusinessAgentOutput };
    if (!res.ok || !data.ok || !data.business) {
      throw new Error(data.error || 'Failed to run Business Agent');
    }

    setBusiness(data.business);
    return data.business;
  }

  async function runEngineering(url: string, rawRequirement: string, handoffBrief: string) {
    const res = await fetch('/api/engineering-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl: url,
        requirement: rawRequirement,
        handoff_brief: handoffBrief
      })
    });

    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      engineering?: EngineeringAgentOutput;
      evidence?: RetrievedEvidence;
    };

    if (!res.ok || !data.ok || !data.engineering || !data.evidence) {
      throw new Error(data.error || 'Failed to run Engineering Agent');
    }

    setEngineering(data.engineering);
    setEvidence(data.evidence);
  }

  async function onIndexRepo(forceRefresh = false) {
    setError(null);
    setBusy((prev) => ({ ...prev, index: true }));

    try {
      await indexRepo(repoUrl, forceRefresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to index repository');
    } finally {
      setBusy((prev) => ({ ...prev, index: false }));
    }
  }

  async function onRunBusinessAgent() {
    setError(null);
    setBusy((prev) => ({ ...prev, business: true }));

    try {
      if (!repoInfo) {
        setBusy((prev) => ({ ...prev, index: true }));
        await indexRepo(repoUrl);
        setBusy((prev) => ({ ...prev, index: false }));
      }

      await runBusiness(repoUrl, requirement);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Business Agent');
    } finally {
      setBusy((prev) => ({ ...prev, business: false, index: false }));
    }
  }

  async function onRunEngineeringAgent() {
    if (!business?.handoff_brief) {
      setError('Run Business Agent first so Engineering Agent receives the handoff brief.');
      return;
    }

    setError(null);
    setBusy((prev) => ({ ...prev, engineering: true }));

    try {
      await runEngineering(repoUrl, requirement, business.handoff_brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Engineering Agent');
    } finally {
      setBusy((prev) => ({ ...prev, engineering: false }));
    }
  }

  async function onRunJudgesDemo() {
    setError(null);
    setBusy({ index: true, business: true, engineering: true, demo: true });

    try {
      await indexRepo(repoUrl);
      const businessOutput = await runBusiness(repoUrl, requirement);
      await runEngineering(repoUrl, requirement, businessOutput.handoff_brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run full judges demo');
    } finally {
      setBusy({ index: false, business: false, engineering: false, demo: false });
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6">
      <section className="mb-8 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950/60 to-slate-950 p-6">
        <p className="mb-3 inline-block rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
          BridgeAI · Judge-ready demo
        </p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">From requirement to implementation plan in under 2 minutes.</h1>
        <p className="mt-3 max-w-4xl text-slate-200">
          BridgeAI turns one business request into a clear Business brief, a repository-grounded Engineering plan, and evidence traceability so judges can
          immediately trust the output.
        </p>
        <div className="mt-4 grid gap-2 text-sm text-slate-200 md:grid-cols-3">
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">1) Paste public GitHub loan-calculator repo</p>
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">2) Enter requirement and run dual-agent flow</p>
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">3) Show impacted files and next engineering steps</p>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
            <p className="font-semibold text-blue-200">Why two AI roles?</p>
            <p className="mt-1 text-xs text-slate-300">
              Business Agent improves requirement quality. Engineering Agent then translates that handoff into file-level execution and testing, reducing
              ambiguity between teams.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
            <p className="font-semibold text-blue-200">How we handle context-window limits</p>
            <p className="mt-1 text-xs text-slate-300">
              We index once, summarize repo and files, chunk source text, retrieve only top evidence, and send just those snippets to the model.
            </p>
          </div>
        </div>
      </section>

      <section className="card mb-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={!canRun || busy.demo} onClick={onRunJudgesDemo}>
            {busy.demo ? 'Running full demo…' : 'Run Judges Demo (End-to-End)'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setRepoUrl(SAMPLE_REPO);
              setRequirement(SAMPLE_REQUIREMENT);
            }}
          >
            Load sample repo + requirement
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Public GitHub repository URL</label>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="input"
              placeholder="https://github.com/owner/repo"
            />
            <p className="mt-2 text-xs text-slate-400">Status: {busy.index ? 'Indexing repository…' : indexedBadge}</p>
            {repoInfo ? (
              <>
                <p className="mt-1 text-xs text-slate-400">Indexed at {new Date(repoInfo.indexedAt).toLocaleString()}</p>
                {indexMode ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Index mode: {indexMode === 'refreshed' ? 'Fresh fetch from GitHub' : 'Used cache when available for faster demo reliability'}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-300">{repoInfo.summary}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Indexed folders: {repoInfo.folderCount} · Logic candidates: {repoInfo.likelyLogicFiles.length} · UI candidates:{' '}
                  {repoInfo.likelyUiFiles.length} · Tests: {repoInfo.likelyTests.length}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Tip: click “Run Judges Demo” for a one-click, pitch-ready walkthrough.</p>
            )}
          </div>
          <button className="btn-secondary h-10 self-end" disabled={busy.index || busy.demo || !repoUrl.trim()} onClick={() => onIndexRepo(false)}>
            {busy.index ? 'Indexing…' : 'Index Repo Only'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className="btn-secondary" disabled={busy.index || busy.demo || !repoUrl.trim()} onClick={() => onIndexRepo(true)}>
            {busy.index ? 'Refreshing…' : 'Force Re-index (Refresh cache)'}
          </button>
          <p className="self-center text-xs text-slate-400">
            Use force re-index right before judging to avoid stale cache and reflect latest repo state.
          </p>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">Business requirement</label>
            <button className="btn-secondary" onClick={() => setRequirement(SAMPLE_REQUIREMENT)}>
              Use sample requirement
            </button>
          </div>
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="input min-h-28"
            placeholder="Describe the product behavior or policy update you need in the loan calculator."
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={busy.business || busy.demo || !canRun} onClick={onRunBusinessAgent}>
              {busy.business ? 'Generating…' : 'Run Business Agent'}
            </button>
            <button
              className="btn-secondary"
              disabled={busy.engineering || busy.demo || !business?.handoff_brief}
              onClick={onRunEngineeringAgent}
            >
              {busy.engineering ? 'Generating…' : 'Run Engineering Agent'}
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AgentPanel title="Business Agent" subtitle="Business-ready requirement brief" loading={busy.business || busy.demo}>
          {!business ? (
            <p className="text-sm text-slate-400">No output yet. Run the Business Agent to transform the requirement into a polished delivery brief.</p>
          ) : (
            <div className="space-y-4 rounded-xl border border-blue-400/20 bg-gradient-to-b from-blue-950/40 to-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Feature Name</p>
                  <p className="mt-1 text-base font-semibold text-white">{business.feature_name}</p>
                </div>
                <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">Ready for handoff</span>
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

        <AgentPanel title="Engineering Agent" subtitle="Repository-grounded technical plan" loading={busy.engineering || busy.demo}>
          {!engineering ? (
            <p className="text-sm text-slate-400">No output yet. Run Engineering Agent after business handoff to produce a technical implementation plan.</p>
          ) : (
            <>
              <p>
                <strong>Current system:</strong> {engineering.current_system_summary}
              </p>
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
              <p>
                <strong>Business explanation:</strong> {engineering.business_explanation}
              </p>
            </>
          )}
        </AgentPanel>
      </section>

      <div className="mt-6">
        <EvidencePanel
          evidence={evidence}
          requirement={requirement}
          handoffBrief={business?.handoff_brief ?? null}
          engineeringPlan={engineering?.implementation_plan ?? []}
          loading={busy.engineering || busy.demo}
        />
      </div>
    </main>
  );
}
