import { NextResponse } from 'next/server';
import { buildRepoManifest } from '@/lib/github';
import { generateStructuredOutput } from '@/lib/openai';
import {
  buildBusinessUserPrompt,
  buildEngineeringUserPrompt,
  businessSystemPrompt,
  engineeringSystemPrompt
} from '@/lib/prompts';
import { analyzeRequestSchema, businessSchema, engineeringSchema } from '@/lib/schemas';
import { retrieveRelevantChunks } from '@/lib/retrieval';
import { AnalyzeResponse } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, requirement } = analyzeRequestSchema.parse(body);

    const manifest = await buildRepoManifest(repoUrl);
    const evidence = retrieveRelevantChunks(manifest, requirement);

    const summaryContext = evidence.matchedFileSummaries
      .map((file) => `${file.path} (score ${file.score}): ${file.summary}`)
      .join('\n');

    const evidenceText = `${summaryContext}\n\n` + evidence.chunks
      .map(
        (chunk) =>
          `${chunk.path} (${chunk.startLine}-${chunk.endLine})\n${chunk.text.slice(0, 650)}`
      )
      .join('\n\n---\n\n');

    const businessFallback = {
      feature_name: 'Loan calculator requirement refinement',
      business_goal: `Deliver the requested behavior for the loan calculator flow: ${requirement}`,
      user_story:
        'As a business stakeholder, I want the calculator to reflect the new requirement so users get trustworthy loan outcomes.',
      acceptance_criteria: [
        'Requirement is reflected in calculator UI behavior.',
        'Result output updates correctly with the new rule.',
        'Validation and error handling cover expected user input.'
      ],
      assumptions: ['Repository uses a standard loan calculation workflow.', 'Public repository content is complete enough for planning.'],
      edge_cases: ['Empty or invalid numeric fields.', 'Extremely large loan terms or amounts.', 'Rounding behavior at decimal boundaries.'],
      open_questions: ['Should new behavior be optional or default?', 'Are there compliance constraints for displayed numbers?'],
      handoff_brief: 'Implement requirement with explicit input validation, unit tests for formula changes, and a clear UX explanation.'
    };

    const engineeringFallback = {
      current_system_summary: manifest.summary,
      impacted_files: evidence.topPaths.slice(0, 6).map((path) => ({
        path,
        why: 'Retrieved as likely relevant to requirement keywords and loan calculation flow.'
      })),
      implementation_plan: [
        'Locate calculation function and related input handling.',
        'Apply requirement logic with isolated helper functions.',
        'Update UI labels or messaging to match new behavior.',
        'Add tests for normal, boundary, and invalid scenarios.'
      ],
      test_plan: [
        'Unit tests for updated calculation logic.',
        'UI test for requirement-specific flow.',
        'Regression test for existing loan term and payment scenarios.'
      ],
      risks: ['Assumed file relevance may miss hidden coupling.', 'GitHub API limits can reduce indexing coverage.'],
      business_explanation:
        'The implementation targets a small set of high-impact files so the feature can be delivered quickly and demoed reliably.'
    };

    const business = await generateStructuredOutput(
      businessSchema,
      businessSystemPrompt,
      buildBusinessUserPrompt(requirement, manifest.summary, evidenceText),
      businessFallback
    );

    const engineering = await generateStructuredOutput(
      engineeringSchema,
      engineeringSystemPrompt,
      buildEngineeringUserPrompt(requirement, business.handoff_brief, manifest.summary, evidenceText),
      engineeringFallback
    );

    const response: AnalyzeResponse = { business, engineering, evidence };

    return NextResponse.json({ ok: true, ...response });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze requirement.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
