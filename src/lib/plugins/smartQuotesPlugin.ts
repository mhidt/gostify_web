import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import {
	CLOSE_QUOTE,
	charAt,
	hasUnclosedQuote,
	OPEN_QUOTE,
} from "./_shared/quoteUtils";

export const smartQuotesPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("smart-quotes"),
			props: {
				handleTextInput(view, from, to, text) {
					if (text !== '"') return false;

					const { state } = view;
					const selectedText = state.doc.textBetween(from, to);
					const charAfter = charAt(state.doc, to);

					if (selectedText) {
						const tr = state.tr.insertText(
							`${OPEN_QUOTE}${selectedText}${CLOSE_QUOTE}`,
							from,
							to,
						);
						view.dispatch(
							tr.setSelection(
								TextSelection.create(
									tr.doc,
									from + 1,
									from + 1 + selectedText.length,
								),
							),
						);
						return true;
					}

					if (charAfter === CLOSE_QUOTE) {
						view.dispatch(
							state.tr.setSelection(TextSelection.create(state.doc, from + 1)),
						);
						return true;
					}

					const pair = !charAfter || /\s/.test(charAfter);
					const insert = hasUnclosedQuote(state.doc, from)
						? CLOSE_QUOTE
						: pair
							? OPEN_QUOTE + CLOSE_QUOTE
							: OPEN_QUOTE;
					const nextSelection =
						insert.length === 2 ? from + 1 : from + insert.length;
					const tr = state.tr.insertText(insert, from, to);
					view.dispatch(
						tr.setSelection(TextSelection.create(tr.doc, nextSelection)),
					);
					return true;
				},

				handleKeyDown(view, event) {
					if (event.key !== "Backspace") return false;

					const { state } = view;
					const { from, to } = state.selection;
					if (from !== to) return false;

					if (
						charAt(state.doc, from - 1) !== OPEN_QUOTE ||
						charAt(state.doc, from) !== CLOSE_QUOTE
					)
						return false;

					event.preventDefault();
					view.dispatch(state.tr.delete(from - 1, from + 1));
					return true;
				},
			},
		}),
);
