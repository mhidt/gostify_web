import { DocxPluginSettings } from "@/core/settings";
import { buildDocument } from "@/core/docx/builder";
import { downloadBlob } from "@/lib/downloadBlob";

export async function exportDocx(
  markdown: string,
  settings: DocxPluginSettings,
  imageProvider: { getImageBuffer: (name: string) => Promise<ArrayBuffer | null>; getImageDimensions: (name: string) => Promise<{ width: number; height: number } | null> },
) {
  const doc = await buildDocument(markdown, settings, imageProvider);
  const { Packer } = await import("docx");
  const blob = await Packer.toBlob(doc);
  const fileName = `document.${settings.saveFormat}`;
  downloadBlob(blob, fileName);
}
