import {
	type EditorState,
	Plugin,
	PluginKey,
	type Transaction,
} from "@milkdown/kit/prose/state";
import {
	Decoration,
	DecorationSet,
	type EditorView,
} from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

export interface SearchMatch {
	from: number;
	to: number;
}

export interface SearchState {
	query: string;
	replacement: string;
	caseSensitive: boolean;
	currentIndex: number;
	matches: SearchMatch[];
}

type SearchMeta = Partial<
	Pick<SearchState, "query" | "replacement" | "caseSensitive" | "currentIndex">
> & {
	clear?: boolean;
};

export const searchPluginKey = new PluginKey<SearchState>("editor-search");

const emptySearchState: SearchState = {
	query: "",
	replacement: "",
	caseSensitive: false,
	currentIndex: -1,
	matches: [],
};

function findMatches(
	state: EditorState,
	query: string,
	caseSensitive: boolean,
): SearchMatch[] {
	if (!query) return [];

	const needle = caseSensitive ? query : query.toLocaleLowerCase();
	const matches: SearchMatch[] = [];

	state.doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return true;

		const haystack = caseSensitive ? node.text : node.text.toLocaleLowerCase();
		let index = haystack.indexOf(needle);

		while (index !== -1) {
			matches.push({
				from: pos + index,
				to: pos + index + query.length,
			});
			index = haystack.indexOf(needle, index + Math.max(needle.length, 1));
		}

		return true;
	});

	return matches;
}

function clampCurrentIndex(index: number, matchCount: number) {
	if (matchCount === 0) return -1;
	if (index < 0) return 0;
	if (index >= matchCount) return matchCount - 1;
	return index;
}

function buildState(
	previous: SearchState,
	tr: Transaction,
	state: EditorState,
): SearchState {
	const meta = tr.getMeta(searchPluginKey) as SearchMeta | undefined;
	const base = meta?.clear ? emptySearchState : { ...previous, ...meta };
	const shouldRecompute =
		tr.docChanged ||
		Boolean(meta && ("query" in meta || "caseSensitive" in meta || meta.clear));
	const matches = shouldRecompute
		? findMatches(state, base.query, base.caseSensitive)
		: base.matches;
	const currentIndex = clampCurrentIndex(base.currentIndex, matches.length);

	return {
		...base,
		currentIndex,
		matches,
	};
}

function scrollToCurrentMatch(view: EditorView) {
	requestAnimationFrame(() => {
		const currentMatch = view.dom.querySelector<HTMLElement>(
			".search-match-current",
		);
		currentMatch?.scrollIntoView({ block: "center", inline: "nearest" });
	});
}

function dispatchSearchMeta(view: EditorView, meta: SearchMeta) {
	view.dispatch(view.state.tr.setMeta(searchPluginKey, meta));
}

export function getSearchState(state: EditorState): SearchState {
	return searchPluginKey.getState(state) ?? emptySearchState;
}

export function setSearchQuery(view: EditorView, query: string) {
	dispatchSearchMeta(view, { query, currentIndex: 0 });
	scrollToCurrentMatch(view);
}

export function setSearchReplacement(view: EditorView, replacement: string) {
	dispatchSearchMeta(view, { replacement });
}

export function setSearchCaseSensitive(
	view: EditorView,
	caseSensitive: boolean,
) {
	dispatchSearchMeta(view, { caseSensitive, currentIndex: 0 });
	scrollToCurrentMatch(view);
}

export function clearSearch(view: EditorView) {
	dispatchSearchMeta(view, { clear: true });
}

export function goToSearchMatch(view: EditorView, direction: 1 | -1) {
	const state = getSearchState(view.state);
	if (state.matches.length === 0) return;

	const currentIndex =
		(state.currentIndex + direction + state.matches.length) %
		state.matches.length;
	dispatchSearchMeta(view, { currentIndex });
	scrollToCurrentMatch(view);
}

export function replaceCurrentSearchMatch(
	view: EditorView,
	replacement: string,
) {
	const state = getSearchState(view.state);
	const match = state.matches[state.currentIndex];
	if (!match) return;

	view.dispatch(
		view.state.tr
			.insertText(replacement, match.from, match.to)
			.setMeta(searchPluginKey, {
				replacement,
				currentIndex: state.currentIndex,
			})
			.scrollIntoView(),
	);
	scrollToCurrentMatch(view);
}

export function replaceAllSearchMatches(view: EditorView, replacement: string) {
	const state = getSearchState(view.state);
	if (state.matches.length === 0) return;

	const tr = view.state.tr;
	for (const match of [...state.matches].reverse()) {
		tr.insertText(replacement, match.from, match.to);
	}

	view.dispatch(
		tr
			.setMeta(searchPluginKey, { replacement, currentIndex: 0 })
			.scrollIntoView(),
	);
}

export const searchPlugin = $prose(
	() =>
		new Plugin<SearchState>({
			key: searchPluginKey,
			state: {
				init: () => emptySearchState,
				apply: (tr, value, _oldState, newState) =>
					buildState(value, tr, newState),
			},
			props: {
				decorations(state) {
					const searchState = getSearchState(state);
					if (searchState.matches.length === 0) return DecorationSet.empty;

					return DecorationSet.create(
						state.doc,
						searchState.matches.map((match, index) =>
							Decoration.inline(match.from, match.to, {
								class:
									index === searchState.currentIndex
										? "search-match search-match-current"
										: "search-match",
							}),
						),
					);
				},
			},
		}),
);
