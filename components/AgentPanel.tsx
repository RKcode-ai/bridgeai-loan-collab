import React from 'react';

type AgentPanelProps = {
  title: string;
  subtitle: string;
  loading?: boolean;
  children: React.ReactNode;
};

export function AgentPanel({ title, subtitle, loading, children }: AgentPanelProps) {
  return (
    <section className="card h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
        {loading ? <span className="text-xs text-blue-300">Thinking…</span> : null}
      </div>
      <div className="space-y-3 text-sm text-slate-100">{children}</div>
    </section>
  );
}
