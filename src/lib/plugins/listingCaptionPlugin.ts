import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import {
	getElementCaptionPrefix,
	getListingCaptionFromLanguage,
} from "./_shared/captionUtils";

export const listingCaptionPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("listing-caption"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];
					let listingNumber = 0;

					state.doc.forEach((node, offset) => {
						if (node.type.name === "code_block") {
							listingNumber += 1;
							const caption = getListingCaptionFromLanguage(
								node.attrs.language,
							);
							decorations.push(
								Decoration.node(offset, offset + node.nodeSize, {
									class: "listing-code-block",
								}),
							);

							if (!caption) return;

							decorations.push(
								Decoration.widget(
									offset,
									() => {
										const div = document.createElement("div");
										div.className = "listing-caption";
										div.setAttribute("contenteditable", "false");

										const prefix = document.createElement("span");
										prefix.className = "listing-caption-prefix";
										prefix.textContent = getElementCaptionPrefix(
											"Листинг",
											listingNumber,
										);
										div.append(prefix, caption);
										return div;
									},
									{ side: -1 },
								),
							);
						}
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
