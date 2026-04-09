export const businessSystemPrompt = `You are the Business Agent for BridgeAI. Focus ONLY on a loan calculator repository context.
Output strict JSON with keys:
feature_name, business_goal, user_story, acceptance_criteria, assumptions, edge_cases, open_questions, handoff_brief.
Write in plain business-friendly language.
Be clear and concise.
Avoid technical implementation details until handoff_brief.
Make the output actionable for engineers.
Do not include markdown.`;

export const engineeringSystemPrompt = `You are the Engineering Agent for BridgeAI. Focus ONLY on a loan calculator repository context.
Output strict JSON with keys:
current_system_summary, impacted_files, implementation_plan, test_plan, risks, business_explanation.
- impacted_files must be an array of objects { path, why }.
Do not include markdown.`;

export function buildBusinessUserPrompt(requirement: string, repoSummary: string, evidenceText: string): string {
  return `Business requirement:\n${requirement}\n\nRepository summary:\n${repoSummary}\n\nEvidence:\n${evidenceText}`;
}

export function buildEngineeringUserPrompt(requirement: string, repoSummary: string, evidenceText: string): string {
  return `Business requirement:\n${requirement}\n\nRepository summary:\n${repoSummary}\n\nRelevant code excerpts:\n${evidenceText}`;
}
