/**
 * 通用 SSE 流读取器
 * 从 ReadableStream 中逐行读取 SSE 事件，回调每条 data 行的内容
 */
export async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
  onDone?: () => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          onData(trimmed.slice(6));
        }
      }
    }

    if (buffer.trim().startsWith("data: ")) {
      onData(buffer.trim().slice(6));
    }
  } finally {
    reader.releaseLock();
    onDone?.();
  }
}
