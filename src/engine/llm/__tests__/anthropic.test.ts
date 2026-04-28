import { describe, it, expect, afterEach, vi } from 'vitest';
import { AnthropicProvider } from '../anthropic';
import type { LLMMessage } from '../types';

// 构造最小 SSE 响应：只需 readable body，内容不重要
function makeSseResponse(): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"message_stop"}\n\n'));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

type FetchCall = { url: string; body: Record<string, unknown> };

function installFetchSpy(): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (url: unknown, init?: unknown) => {
    const initObj = (init as { body?: string }) ?? {};
    calls.push({
      url: String(url),
      body: initObj.body ? JSON.parse(initObj.body) : {},
    });
    return makeSseResponse();
  }) as unknown as typeof globalThis.fetch;
  return {
    calls,
    restore: () => { globalThis.fetch = original; },
  };
}

describe('AnthropicProvider prompt caching', () => {
  let spy: ReturnType<typeof installFetchSpy>;

  afterEach(() => {
    spy?.restore();
  });

  function provider() {
    return new AnthropicProvider({
      apiKey: 'test-key',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      maxTokens: 1024,
    } as never);
  }

  it('sends system as plain string when no cacheBoundary', async () => {
    spy = installFetchSpy();
    const p = provider();
    const messages: LLMMessage[] = [
      { role: 'system', content: 'you are x' },
      { role: 'user', content: 'hi' },
    ];
    await p.chat(messages);
    const body = spy.calls[0].body;
    expect(body.system).toBe('you are x');
  });

  it('wraps system in blocks with cache_control when cacheBoundary is set', async () => {
    spy = installFetchSpy();
    const p = provider();
    const messages: LLMMessage[] = [
      { role: 'system', content: 'stable prefix', cacheBoundary: true },
      { role: 'user', content: 'hi' },
    ];
    await p.chat(messages);
    const body = spy.calls[0].body;
    expect(Array.isArray(body.system)).toBe(true);
    const blocks = body.system as Array<Record<string, unknown>>;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'text',
      text: 'stable prefix',
      cache_control: { type: 'ephemeral' },
    });
  });

  it('splits system into cached prefix + uncached tail after boundary', async () => {
    spy = installFetchSpy();
    const p = provider();
    const messages: LLMMessage[] = [
      { role: 'system', content: 'stable prefix', cacheBoundary: true },
      { role: 'user', content: 'prev user' },
      { role: 'assistant', content: 'prev assistant' },
      { role: 'system', content: 'dynamic tail' },
      { role: 'user', content: 'now' },
    ];
    await p.chat(messages);
    const body = spy.calls[0].body;
    const blocks = body.system as Array<Record<string, unknown>>;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks[0].text).toBe('stable prefix');
    expect(blocks[1].text).toBe('dynamic tail');
    expect(blocks[1].cache_control).toBeUndefined();
    // chat messages 保持原顺序
    expect(body.messages).toEqual([
      { role: 'user', content: 'prev user' },
      { role: 'assistant', content: 'prev assistant' },
      { role: 'user', content: 'now' },
    ]);
  });

  it('merges multiple boundary-marked system messages into one cached block', async () => {
    spy = installFetchSpy();
    const p = provider();
    const messages: LLMMessage[] = [
      { role: 'system', content: 'A', cacheBoundary: true },
      { role: 'system', content: 'B', cacheBoundary: true },
      { role: 'user', content: 'hi' },
    ];
    await p.chat(messages);
    const body = spy.calls[0].body;
    const blocks = body.system as Array<Record<string, unknown>>;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('A\n\nB');
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('omits system field entirely when no system messages', async () => {
    spy = installFetchSpy();
    const p = provider();
    await p.chat([{ role: 'user', content: 'hi' }]);
    const body = spy.calls[0].body;
    expect(body.system).toBeUndefined();
  });
});
