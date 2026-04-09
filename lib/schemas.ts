import { z } from 'zod';

export const repoUrlSchema = z
  .string()
  .url('Enter a valid URL')
  .refine((value) => /^https?:\/\/github\.com\/.+\/.+/.test(value), {
    message: 'Use a public GitHub repository URL.'
  });

export const businessSchema = z.object({
  feature_name: z.string(),
  business_goal: z.string(),
  user_story: z.string(),
  acceptance_criteria: z.array(z.string()),
  assumptions: z.array(z.string()),
  edge_cases: z.array(z.string()),
  open_questions: z.array(z.string()),
  handoff_brief: z.string()
});

export const engineeringSchema = z.object({
  current_system_summary: z.string(),
  impacted_files: z.array(z.object({ path: z.string(), why: z.string() })),
  implementation_plan: z.array(z.string()),
  test_plan: z.array(z.string()),
  risks: z.array(z.string()),
  business_explanation: z.string()
});

export const indexRepoRequestSchema = z.object({
  repoUrl: repoUrlSchema
});

export const analyzeRequestSchema = z.object({
  repoUrl: repoUrlSchema,
  requirement: z.string().min(10, 'Requirement must be at least 10 characters')
});
