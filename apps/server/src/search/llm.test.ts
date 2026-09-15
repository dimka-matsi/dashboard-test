import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';

import { silentLogger } from '../lib/logger';
import { createLlmParser } from './llm';

function fakeClient(
  response: unknown,
): Pick<Anthropic, 'messages'> & { create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue(response);
  return { messages: { create } as unknown as Anthropic['messages'], create };
}

const options = { apiKey: 'test', model: 'test-model', timeoutMs: 1000, log: silentLogger };

describe('createLlmParser', () => {
  it('передаёт structured output и валидирует ответ схемой фильтра', async () => {
    const client = fakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ levels: [2], performance: { max: 50 } }) }],
    });
    const parse = createLlmParser({ ...options, client });

    await expect(parse('отделы с эффективностью ниже 50')).resolves.toEqual({
      levels: [2],
      performance: { max: 50 },
    });
    const [params, requestOptions] = client.create.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(params).toMatchObject({
      model: 'test-model',
      output_config: { effort: 'low', format: { type: 'json_schema' } },
    });
    expect(requestOptions).toEqual({ timeout: 1000 });
  });

  it('ответ вне схемы → null', async () => {
    const client = fakeClient({
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: JSON.stringify({ sort: { column: 'nope', direction: 'desc' } }) },
      ],
    });
    await expect(createLlmParser({ ...options, client })('x y')).resolves.toBeNull();
  });

  it('отказ модели или ошибка API → null', async () => {
    await expect(
      createLlmParser({ ...options, client: fakeClient({ stop_reason: 'refusal', content: [] }) })(
        'x y',
      ),
    ).resolves.toBeNull();

    const failing = {
      messages: { create: vi.fn().mockRejectedValue(new Error('boom')) },
    } as unknown as Pick<Anthropic, 'messages'>;
    await expect(createLlmParser({ ...options, client: failing })('x y')).resolves.toBeNull();
  });
});
