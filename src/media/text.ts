export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function wrapText(text: string, maxChars: number): string[] {
  if (!text.trim()) return [];
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }
      if (`${current} ${word}`.length <= maxChars) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export function fitLines(
  text: string | undefined,
  maxChars: number,
  maxLines: number,
): { lines: string[]; truncated: boolean } {
  const lines = wrapText(text ?? '', maxChars);
  if (lines.length <= maxLines) return { lines, truncated: false };
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1] ?? '';
  kept[maxLines - 1] = `${last.replace(/[\s.,;:!?-]+$/, '')}...`;
  return { lines: kept, truncated: true };
}

export function estimateCharsPerLine(contentWidth: number, fontSize: number, factor = 0.55): number {
  return Math.max(8, Math.floor(contentWidth / (fontSize * factor)));
}
