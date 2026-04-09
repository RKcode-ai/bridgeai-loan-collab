import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function generateStructuredOutput<T extends z.ZodTypeAny>(
  schema: T,
  systemPrompt: string,
  userPrompt: string,
  fallback: z.infer<T>
): Promise<z.infer<T>> {
  if (!client) return fallback;

  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
      ],
      text: {
        format: zodTextFormat(schema, 'agent_output')
      },
      temperature: 0.2
    });

    const parsed =
      response.output_parsed ??
      response.output
        ?.filter((item): item is Extract<(typeof response.output)[number], { type: 'message' }> => item.type === 'message')
        .flatMap((item) => item.content)
        .find((content): content is Extract<(typeof response.output)[number], { type: 'message' }>['content'][number] & { parsed: unknown } => 'parsed' in content)
        ?.parsed;
    if (!parsed) return fallback;

    return schema.parse(parsed);
  } catch {
    return fallback;
  }
}
