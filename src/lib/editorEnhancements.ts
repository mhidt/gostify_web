import {
	bibliographyDecorationPlugin,
	bibliographyPlugin,
} from "@/lib/plugins/bibliographyPlugin";
import { changeCasePlugin } from "@/lib/plugins/changeCasePlugin";
import { codeBlockMetaPlugin } from "@/lib/plugins/codeBlockMetaPlugin";
import {
	elementPlaceholderPlugin,
	imagePlaceholderPlugin,
} from "@/lib/plugins/elementPlaceholderPlugin";
import { headingFormattingPlugin } from "@/lib/plugins/headingFormattingPlugin";
import { headingMarkerPlugin } from "@/lib/plugins/headingMarkerPlugin";
import { imageCaptionAlignmentPlugin } from "@/lib/plugins/imageCaptionAlignmentPlugin";
import { listingCaptionPlugin } from "@/lib/plugins/listingCaptionPlugin";
import {
	pageBreakDisplayPlugin,
	pageBreakPlugin,
} from "@/lib/plugins/pageBreakPlugin";
import { resizableImagePlugin } from "@/lib/plugins/resizableImagePlugin";
import { saveShortcutPlugin } from "@/lib/plugins/saveShortcutPlugin";
import { smartQuotesPlugin } from "@/lib/plugins/smartQuotesPlugin";
import { tableCaptionPlugin } from "@/lib/plugins/tableCaptionPlugin";
import { trimDoubleClickSelectionPlugin } from "@/lib/plugins/trimDoubleClickSelectionPlugin";

export { setEditorDisplaySettings } from "@/lib/plugins/_shared/captionUtils";
export {
	bibliographyDecorationPlugin,
	bibliographyPlugin,
	changeCasePlugin,
	codeBlockMetaPlugin,
	elementPlaceholderPlugin,
	headingFormattingPlugin,
	headingMarkerPlugin,
	imageCaptionAlignmentPlugin,
	imagePlaceholderPlugin,
	listingCaptionPlugin,
	pageBreakDisplayPlugin,
	pageBreakPlugin,
	resizableImagePlugin,
	saveShortcutPlugin,
	smartQuotesPlugin,
	tableCaptionPlugin,
	trimDoubleClickSelectionPlugin,
};

export const editorEnhancementPlugins = [
	...codeBlockMetaPlugin,
	trimDoubleClickSelectionPlugin,
	smartQuotesPlugin,
	headingMarkerPlugin,
	headingFormattingPlugin,
	pageBreakDisplayPlugin,
	pageBreakPlugin,
	saveShortcutPlugin,
	changeCasePlugin,
	resizableImagePlugin,
	elementPlaceholderPlugin,
	imageCaptionAlignmentPlugin,
	listingCaptionPlugin,
	tableCaptionPlugin,
	bibliographyPlugin,
	bibliographyDecorationPlugin,
];
