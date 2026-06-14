import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { getCaptionPrefix, hasCaptionPrefix } from "./_shared/captionUtils";
import {
	containsImageNode,
	isEmptyParagraph,
	isStandaloneImageParagraph,
} from "./_shared/nodeUtils";

export const imageCaptionAlignmentPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("image-caption-alignment"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];
					let imageNumber = 0;
					let pendingCaptionNumber: number | null = null;

					state.doc.forEach((node, offset) => {
						const hasImage = containsImageNode(node);
						const standaloneImage = isStandaloneImageParagraph(node);
						const isCaption =
							pendingCaptionNumber !== null &&
							!hasImage &&
							node.type.name === "paragraph" &&
							node.textContent.trim().length > 0;

						if (isCaption && pendingCaptionNumber !== null) {
							const captionNumber = pendingCaptionNumber;
							decorations.push(
								Decoration.node(offset, offset + node.nodeSize, {
									class: "image-caption",
								}),
							);

							if (!hasCaptionPrefix(node.textContent)) {
								decorations.push(
									Decoration.widget(
										offset + 1,
										() => {
											const span = document.createElement("span");
											span.className = "image-caption-prefix";
											span.textContent = getCaptionPrefix(captionNumber);
											span.setAttribute("contenteditable", "false");
											return span;
										},
										{ side: -1 },
									),
								);
							}
						}

						if (standaloneImage) {
							decorations.push(
								Decoration.node(offset, offset + node.nodeSize, {
									class: "image-paragraph",
								}),
							);
						}

						if (hasImage) {
							imageNumber += 1;
							pendingCaptionNumber = imageNumber;
							return;
						}

						if (isCaption) {
							pendingCaptionNumber = null;
							return;
						}

						if (!isEmptyParagraph(node)) {
							pendingCaptionNumber = null;
						}
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
