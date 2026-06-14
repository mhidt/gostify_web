import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import {
	Decoration,
	DecorationSet,
	type EditorView,
} from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

function commitLinkHref(view: EditorView, input: HTMLInputElement): void {
	const from = Number(input.dataset.bibFrom);
	const to = Number(input.dataset.bibTo);
	const currentHref = input.dataset.bibHref ?? "";
	const nextHref = input.value.trim();
	if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;

	if (nextHref === currentHref) return;

	const linkMark = view.state.schema.marks.link;
	if (!linkMark) return;

	const tr = view.state.tr.removeMark(from, to, linkMark);
	if (nextHref) {
		tr.addMark(from, to, linkMark.create({ href: nextHref }));
	}

	view.dispatch(
		tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView(),
	);
}

export const bibliographyPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("bibliography"),
			props: {
				handleDOMEvents: {
					mousedown(view, event) {
						const target = event.target;
						if (!(target instanceof HTMLElement)) return false;

						if (
							target instanceof HTMLInputElement &&
							target.classList.contains("bib-url-input")
						) {
							event.stopPropagation();
							return false;
						}

						const link = target.closest<HTMLElement>(".bib-link, .bib-ref");
						const href = link?.dataset.bibHref;
						if (!href || !(event as MouseEvent).ctrlKey) return false;

						event.preventDefault();
						window.open(href, "_blank", "noopener,noreferrer");
						view.focus();
						return true;
					},
					keydown(view, event) {
						const target = event.target;
						if (
							!(target instanceof HTMLInputElement) ||
							!target.classList.contains("bib-url-input")
						)
							return false;

						if ((event as KeyboardEvent).key === "Escape") {
							event.preventDefault();
							view.focus();
							return true;
						}

						if ((event as KeyboardEvent).key !== "Enter") return false;
						event.preventDefault();
						commitLinkHref(view, target);
						return true;
					},
					focusout(view, event) {
						const target = event.target;
						if (
							!(target instanceof HTMLInputElement) ||
							!target.classList.contains("bib-url-input")
						)
							return false;

						commitLinkHref(view, target);
						return false;
					},
				},
			},
		}),
);

export const bibliographyDecorationPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("bibliography-decorations"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];
					const linkRanges: Array<{ from: number; to: number; href: string }> =
						[];
					const { selection } = state;

					state.doc.descendants((node, pos) => {
						if (!node.isText) return;
						const linkMark = node.marks.find(
							(mark) => mark.type.name === "link",
						);
						const href = linkMark?.attrs.href;
						if (typeof href !== "string" || href.length === 0) return;

						const from = pos;
						const to = pos + node.nodeSize;
						const previous = linkRanges[linkRanges.length - 1];
						if (previous && previous.href === href && previous.to === from) {
							previous.to = to;
							return;
						}

						linkRanges.push({ from, to, href });
					});

					const urlNumbers = new Map<string, number>();
					for (const range of linkRanges) {
						let number = urlNumbers.get(range.href);
						if (number === undefined) {
							number = urlNumbers.size + 1;
							urlNumbers.set(range.href, number);
						}

						const selectionInsideLink =
							selection.from <= range.to && selection.to >= range.from;
						decorations.push(
							Decoration.inline(range.from, range.to, {
								class: selectionInsideLink
									? "bib-link bib-link-editing"
									: "bib-link",
								"data-bib-href": range.href,
								title: range.href,
							}),
						);

						if (selectionInsideLink) {
							decorations.push(
								Decoration.widget(
									range.from,
									() => {
										const span = document.createElement("span");
										span.className = "bib-source-mark";
										span.textContent = "[";
										span.setAttribute("contenteditable", "false");
										return span;
									},
									{ side: -1 },
								),
							);
							decorations.push(
								Decoration.widget(
									range.to,
									() => {
										const span = document.createElement("span");
										span.className = "bib-source-url";
										span.append("](");

										const input = document.createElement("input");
										input.className = "bib-url-input";
										input.value = range.href;
										input.dataset.bibFrom = String(range.from);
										input.dataset.bibTo = String(range.to);
										input.dataset.bibHref = range.href;
										input.setAttribute("aria-label", "URL ссылки");
										span.append(input, ")");
										span.setAttribute("contenteditable", "false");
										return span;
									},
									{ side: 1 },
								),
							);
							continue;
						}

						decorations.push(
							Decoration.widget(
								range.to,
								() => {
									const span = document.createElement("span");
									span.className = "bib-ref";
									span.textContent = ` [${number}]`;
									span.dataset.bibHref = range.href;
									span.title = range.href;
									span.setAttribute("contenteditable", "false");
									return span;
								},
								{ side: 1 },
							),
						);
					}

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
