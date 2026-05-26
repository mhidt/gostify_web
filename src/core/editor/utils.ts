export function switchCase(text: string): string {
  switch (text) {
    case text.toUpperCase():
      return text.toLowerCase();
    case capitalize(text):
      return text.toUpperCase();
    default:
      return capitalize(text);
  }
}

export function capitalize(text: string): string {
  return text[0]?.toUpperCase() + text.slice(1).toLowerCase();
}

export function isImage(line: string): boolean {
  if (line.startsWith("![[") && line.endsWith("]]")) return true;
  if (line.startsWith("![") && line.endsWith(")")) {
    return /^!\[[^\]]*\]\([^)]+\)$/.test(line);
  }
  return false;
}

export function parseImageTag(text: string): { fileName: string; url?: string; requestedWidth?: number } {
  if (text.startsWith("![[")) {
    const inner = text.slice(3, -2);
    const pipeIndex = inner.indexOf("|");
    if (pipeIndex === -1) {
      return { fileName: inner };
    }
    const fileName = inner.slice(0, pipeIndex);
    const widthStr = inner.slice(pipeIndex + 1);
    const requestedWidth = parseInt(widthStr);
    return {
      fileName,
      requestedWidth: isNaN(requestedWidth) ? undefined : requestedWidth,
    };
  }

  const match = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) return { fileName: "" };

  const alt = match[1] ?? "";
  const url = match[2] ?? "";
  const fileName = alt || url.split("/").pop() || "image.png";
  return { fileName, url };
}

export type ParsedSize = { px: number } | { percent: number };

export function parseSizeValue(value: string): ParsedSize | null {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return { percent: num };
    return null;
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return { px: num };
  return null;
}
