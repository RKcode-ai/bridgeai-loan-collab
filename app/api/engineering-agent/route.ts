import { NextResponse } from 'next/server';
import { buildRepoManifest } from '@/lib/github';
import { generateStructuredOutput } from '@/lib/openai';
import { buildEngineeringUserPrompt, engineeringSystemPrompt } from '@/lib/prompts';
import { engineeringAgentRequestSchema, engineeringSchema } from '@/lib/schemas';
import { retrieveRelevantChunks } from '@/lib/retrieval';
import { EngineeringAgentOutput } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, requirement, handoff_brief } = engineeringAgentRequestSchema.parse(body);

    const manifest = await buildRepoManifest(repoUrl);
    const evidence = retrieveRelevantChunks(manifest, `${requirement}\n${handoff_brief}`);

    const summaryContext = evidence.matchedFileSummaries
      .map((file) => `${file.path} (score ${file.score}): ${file.summary}`)
      .join('\n');

    const evidenceText =
      `${summaryContext}\n\n` +
      evidence.chunks
        .map((chunk) => `${chunk.path} (${chunk.startLine}-${chunk.endLine})\n${chunk.text.slice(0, 650)}`)
        .join('\n\n---\n\n');

    const engineeringFallback: EngineeringAgentOutput = {
      current_system_summary: manifest.summary,
      impacted_files: evidence.topPaths.slice(0, 6).map((path) => ({
        path,
        why: 'This file is ranked highly by requirement + handoff retrieval and contains matching loan-calculator logic context.'
      })),
      implementation_plan: [
        'Confirm the calculation and input handling flow in the top retrieved files before making changes.',
        'Apply requirement updates in the most relevant logic paths and keep interfaces stable for existing UI wiring.',
        'Update user-facing labels/messages in impacted UI files so the behavior is understandable for borrowers.',
        'Add or update tests around retrieved calculation paths, including baseline and edge-case scenarios.'
      ],
      test_plan: [
        'Add unit tests that validate the updated behavior in the top impacted logic files.',
        'Run regression scenarios for existing loan calculation outputs to prevent accidental behavior changes.',
        'Verify empty/invalid inputs and boundary values mentioned in the requirement and handoff.'
      ],
      risks: [
        'If retrieval misses a hidden dependency file, implementation may be incomplete until additional evidence is indexed.',
        'Changes in calculation logic can introduce rounding regressions that are visible to end users.'
      ],
      business_explanation:
        'This plan focuses on the files most directly connected to your requirement and business handoff, so engineering can deliver a predictable update quickly while reducing the chance of side effects.'
    };

    const engineering = await generateStructuredOutput(
      engineeringSchema,
      engineeringSystemPrompt,
      buildEngineeringUserPrompt(requirement, handoff_brief, manifest.summary, evidenceText),
      engineeringFallback
    );

    return NextResponse.json({ ok: true, engineering, evidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate Engineering Agent output.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
