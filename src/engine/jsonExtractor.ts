/**
 * 从 LLM 原始输出中安全提取第一个完整 JSON 对象。
 * 使用大括号计数法，正确处理 markdown 包裹、思考文本和截断。
 */
export function extractJson(raw: string): string | null {
  let str = raw.trim();

  // 如果有 ```json ... ``` 包裹，先提取其中内容
  const codeBlockMatch = str.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    str = codeBlockMatch[1].trim();
  }

  // 找到第一个 { 的位置
  const start = str.indexOf('{');
  if (start === -1) return null;

  // 从第一个 { 开始，用括号计数找到匹配的 }
  let braces = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    if (braces === 0) {
      const jsonStr = str.slice(start, i + 1);
      try {
        JSON.parse(jsonStr);
        return jsonStr;
      } catch {
        return null;
      }
    }
  }

  // 括号没闭合（截断），尝试修补
  let truncated = str.slice(start);
  braces = 0;
  let brackets = 0;
  inString = false;
  escape = false;
  for (const ch of truncated) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  if (inString) truncated += '"';
  for (let i = 0; i < brackets; i++) truncated += ']';
  for (let i = 0; i < braces; i++) truncated += '}';

  try {
    JSON.parse(truncated);
    return truncated;
  } catch {
    return null;
  }
}
