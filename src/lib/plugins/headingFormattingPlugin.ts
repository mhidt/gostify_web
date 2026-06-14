import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import {
	getChapterPrefix,
	getParagraphPrefix,
	hasHeadingNumberPrefix,
	isExcludedHeading,
} from "./_shared/captionUtils";

export const headingFormattingPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("heading-formatting"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];
					let chapterNumber = 0;
					let paragraphNumber = 0;
					let hasChapter = false;

					state.doc.descendants((node, pos) => {
						if (node.type.name !== "heading") return;

						const level = Number(node.attrs.level) || 1;
						if (level !== 1 && level !== 2) return;

						const isChapter = level === 1;
						const className = isChapter
							? "editor-chapter-heading"
							: "editor-paragraph-heading";
						if (isChapter && hasChapter) {
							decorations.push(
								Decoration.widget(
									pos,
									() => {
										const div = document.createElement("div");
										div.className = "chapter-page-break";
										div.setAttribute("contenteditable", "false");
										div.setAttribute("aria-label", "Разрыв страницы");
										return div;
									},
									{ side: -1 },
								),
							);
						}
						if (isChapter) hasChapter = true;

						decorations.push(
							Decoration.node(pos, pos + node.nodeSize, {
								class: className,
							}),
						);

						if (isExcludedHeading(node)) return;

						let prefix = "";
						if (isChapter) {
							chapterNumber += 1;
							paragraphNumber = 0;
							prefix = getChapterPrefix(chapterNumber);
						} else {
							paragraphNumber += 1;
							prefix = getParagraphPrefix(
								chapterNumber === 0
									? `${paragraphNumber}`
									: `${chapterNumber}.${paragraphNumber}`,
							);
						}

						if (hasHeadingNumberPrefix(node)) return;

						decorations.push(
							Decoration.widget(
								pos + 1,
								() => {
									const span = document.createElement("span");
									span.className = "heading-number-prefix";
									span.textContent = prefix;
									span.setAttribute("contenteditable", "false");
									return span;
								},
								{ side: -1 },
							),
						);
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
