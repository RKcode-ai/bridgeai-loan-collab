import OpenAI from 'openai';
import { z } from 'zod';

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function extractJsonObject(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Model response did not contain JSON.');
  }
  return match[0];
}

export async function generateStructuredOutput<T extends z.ZodTypeAny>(
  schema: T,
  systemPrompt: string,
  userPrompt: string,
  fallback: z.infer<T>
): Promise<z.infer<T>> {
  if (!client) return fallback;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
      ],
      temperature: 0.2
    });

    const raw = response.output_text?.trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(extractJsonObject(raw));
    return schema.parse(parsed);
  } catch {
    return fallback;
  }
}
