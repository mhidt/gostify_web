import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

export const listingCaptionPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("listing-caption"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];

					state.doc.forEach((node, offset) => {
						if (node.type.name === "code_block") {
							decorations.push(
								Decoration.node(offset, offset + node.nodeSize, {
									class: "listing-code-block",
								}),
							);
						}
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
