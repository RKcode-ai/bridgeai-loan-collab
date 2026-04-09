export type RepoFile = {
  path: string;
  size: number;
  content: string;
  extension: string;
  fileType: 'code' | 'doc' | 'config' | 'data' | 'other';
  category: 'logic' | 'ui' | 'test' | 'other';
};

export type RepoChunk = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  chunkType: 'code' | 'doc';
  tokensHint: number;
};

export type RepoManifestFile = {
  path: string;
  size: number;
  extension: string;
  fileType: RepoFile['fileType'];
  category: RepoFile['category'];
  summary: string;
};

export type RepoManifest = {
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  indexedAt: string;
  summary: string;
  folders: string[];
  files: RepoManifestFile[];
  likelyLogicFiles: string[];
  likelyUiFiles: string[];
  likelyTests: string[];
  chunks: RepoChunk[];
};

export type BusinessAgentOutput = {
  feature_name: string;
  business_goal: string;
  user_story: string;
  acceptance_criteria: string[];
  assumptions: string[];
  edge_cases: string[];
  open_questions: string[];
  handoff_brief: string;
};

export type EngineeringAgentOutput = {
  current_system_summary: string;
  impacted_files: Array<{ path: string; why: string }>;
  implementation_plan: string[];
  test_plan: string[];
  risks: string[];
  business_explanation: string;
};

export type RetrievedEvidence = {
  chunks: RepoChunk[];
  topPaths: string[];
  matchedFileSummaries: Array<{ path: string; summary: string; score: number }>;
};

export type AnalyzeResponse = {
  business: BusinessAgentOutput;
  engineering: EngineeringAgentOutput;
  evidence: RetrievedEvidence;
};
