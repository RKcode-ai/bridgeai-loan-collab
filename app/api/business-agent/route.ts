import { NextResponse } from 'next/server';
import { buildRepoManifest } from '@/lib/github';
import { generateStructuredOutput } from '@/lib/openai';
import { buildBusinessUserPrompt, businessSystemPrompt } from '@/lib/prompts';
import { businessAgentRequestSchema, businessSchema } from '@/lib/schemas';
import { retrieveRelevantChunks } from '@/lib/retrieval';
import { BusinessAgentOutput } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoUrl, requirement } = businessAgentRequestSchema.parse(body);

    const manifest = await buildRepoManifest(repoUrl);
    const evidence = retrieveRelevantChunks(manifest, requirement);

    const summaryContext = evidence.matchedFileSummaries
      .map((file) => `${file.path} (score ${file.score}): ${file.summary}`)
      .join('\n');

    const evidenceText =
      `${summaryContext}\n\n` +
      evidence.chunks
        .map((chunk) => `${chunk.path} (${chunk.startLine}-${chunk.endLine})\n${chunk.text.slice(0, 650)}`)
        .join('\n\n---\n\n');

    const fallback: BusinessAgentOutput = {
      feature_name: 'Loan term calculation enhancement',
      business_goal: `Deliver a clear and trustworthy loan term calculation update for: ${requirement}`,
      user_story:
        'As a borrower comparing options, I want loan term outcomes to be easy to understand so I can make confident decisions.',
      acceptance_criteria: [
        'The requirement is reflected in calculator behavior and output.',
        'Users can see understandable outcomes for each loan term.',
        'Invalid or missing inputs are handled with clear user guidance.'
      ],
      assumptions: [
        'The repository already contains an interactive loan calculator flow.',
        'Loan term values and related inputs are already captured in the UI.'
      ],
      edge_cases: [
        'Very short or very long loan terms.',
        'Zero, negative, or non-numeric values.',
        'Rounding differences near currency boundaries.'
      ],
      open_questions: [
        'Should all available terms be shown or only recommended options?',
        'Do business stakeholders need a compliance disclaimer in the UI?',
        'Should prior calculation behavior remain available as a fallback mode?'
      ],
      handoff_brief:
        'Use the repository evidence to identify where loan term rules and result presentation are defined, add tests for normal and edge scenarios, and ensure result wording remains clear for non-technical users.'
    };

    const business = await generateStructuredOutput(
      businessSchema,
      businessSystemPrompt,
      buildBusinessUserPrompt(requirement, manifest.summary, evidenceText),
      fallback
    );

    return NextResponse.json({ ok: true, business });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate Business Agent output.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
