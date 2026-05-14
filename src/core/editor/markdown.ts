export function normalizeEditorMarkdown(markdown: string): string {
  return markdown
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\[ \t]*(?=\n|$)/g, "")
    .replace(/\u00a0/g, " ");
}
