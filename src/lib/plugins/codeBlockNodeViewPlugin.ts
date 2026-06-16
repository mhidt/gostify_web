import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { highlightCode, isDarkMode, getLangDisplayName } from "@/lib/highlighter";
import { getElementCaptionPrefix } from "@/lib/plugins/_shared/captionUtils";

const LANG_RE = /^(\S+)/;

function extractLang(language: string | null | undefined): string {
	if (!language) return "";
	const match = language.match(LANG_RE);
	return match?.[1] ?? "";
}

function extractCaption(language: string | null | undefined): string {
	if (!language) return "";
	return language.replace(LANG_RE, "").trim();
}

const highlightCache = new Map<string, string>();
const CACHE_MAX = 128;

function cacheKey(code: string, lang: string, dark: boolean): string {
	return `${dark ? "d" : "l"}:${lang}::${code}`;
}

function getCodeText(node: ProseNode): string {
	let text = "";
	node.forEach((child) => {
		if (child.isText && child.text) text += child.text;
	});
	return text;
}

function getListingNumber(view: EditorView, pos: number): number {
	let number = 0;
	let found = false;
	view.state.doc.forEach((node, offset) => {
		if (node.type.name === "code_block") {
			number += 1;
			if (offset === pos) found = true;
		}
	});
	return found ? number : 0;
}

const themeObserver: { observer: MutationObserver | null; views: Set<CodeBlockView> } = {
	observer: null,
	views: new Set(),
};

function watchThemeChange(view: CodeBlockView): void {
	themeObserver.views.add(view);
	if (!themeObserver.observer) {
		themeObserver.observer = new MutationObserver(() => {
			for (const v of themeObserver.views) {
				v.onThemeChange();
			}
		});
		themeObserver.observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
	}
}

function unwatchThemeChange(view: CodeBlockView): void {
	themeObserver.views.delete(view);
	if (themeObserver.views.size === 0 && themeObserver.observer) {
		themeObserver.observer.disconnect();
		themeObserver.observer = null;
	}
}

class CodeBlockView implements NodeView {
	dom: HTMLElement;
	contentDOM: HTMLElement | null = null;

	private node: ProseNode;
	private view: EditorView;
	private getPos: () => number | undefined;
	private selected = false;
	private highlighting = false;
	private headerEl: HTMLElement;
	private codeContainer: HTMLElement;
	private contentPre: HTMLPreElement;
	private lastDark: boolean;

	constructor(node: ProseNode, view: EditorView, getPos: (() => number | undefined) | boolean) {
		this.node = node;
		this.view = view;
		this.getPos = typeof getPos === "function" ? getPos : () => undefined;
		this.lastDark = isDarkMode();

		this.dom = document.createElement("div");
		this.dom.className = "code-block-wrapper";

		this.headerEl = document.createElement("div");
		this.headerEl.className = "code-block-header";

		const left = document.createElement("span");
		left.className = "code-block-lang";
		this.headerEl.appendChild(left);

		const copyBtn = document.createElement("button");
		copyBtn.className = "code-block-copy-btn";
		copyBtn.type = "button";
		copyBtn.textContent = "Copy";
		copyBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const text = getCodeText(this.node);
			navigator.clipboard.writeText(text).then(() => {
				copyBtn.textContent = "Copied!";
				setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
			});
		});
		this.headerEl.appendChild(copyBtn);

		this.dom.appendChild(this.headerEl);

		this.codeContainer = document.createElement("div");
		this.codeContainer.className = "code-block-body";
		this.dom.appendChild(this.codeContainer);

		this.contentPre = document.createElement("pre");
		this.contentPre.className = "code-block-editing";
		this.contentPre.setAttribute("spellcheck", "false");

		const codeEl = document.createElement("code");
		this.contentPre.appendChild(codeEl);
		this.codeContainer.appendChild(this.contentPre);
		this.contentDOM = codeEl;

		this.renderHeader();
		this.scheduleHighlight();
		watchThemeChange(this);
	}

	update(node: ProseNode): boolean {
		if (node.type !== this.node.type) return false;
		if (node.attrs.language !== this.node.attrs.language) {
			this.node = node;
			this.renderHeader();
		}
		this.node = node;
		if (!this.selected) {
			this.scheduleHighlight();
		}
		return true;
	}

	selectNode(): void {
		this.selected = true;
		this.showEditing();
	}

	deselectNode(): void {
		this.selected = false;
		this.showHighlighting();
	}

	stopEvent(event: Event): boolean {
		if (this.selected && this.contentDOM?.contains(event.target as HTMLElement)) {
			return false;
		}
		return this.dom.contains(event.target as HTMLElement);
	}

	ignoreMutation(): boolean {
		if (this.highlighting) return true;
		return !this.selected;
	}

	destroy(): void {
		unwatchThemeChange(this);
		this.dom.remove();
	}

	onThemeChange(): void {
		const dark = isDarkMode();
		if (dark !== this.lastDark) {
			this.lastDark = dark;
			if (!this.selected) {
				this.scheduleHighlight();
			}
		}
	}

	private renderHeader(): void {
		const lang = extractLang(this.node.attrs.language);
		const displayName = getLangDisplayName(lang || "text");

		const pos = this.getPos();
		const listingNumber = typeof pos === "number" ? getListingNumber(this.view, pos) : 0;
		const caption = extractCaption(this.node.attrs.language);

		const left = this.headerEl.querySelector<HTMLElement>(".code-block-lang");
		if (!left) return;

		left.innerHTML = "";

		if (listingNumber > 0) {
			const prefix = document.createElement("span");
			prefix.className = "listing-caption-prefix";
			prefix.textContent = getElementCaptionPrefix("Листинг", listingNumber);
			left.appendChild(prefix);
		}

		const langSpan = document.createElement("span");
		langSpan.className = "code-block-lang-name";
		langSpan.textContent = displayName;
		left.appendChild(langSpan);

		if (caption) {
			const captionSpan = document.createElement("span");
			captionSpan.className = "code-block-lang-caption";
			captionSpan.textContent = ` — ${caption}`;
			left.appendChild(captionSpan);
		}
	}

	private showEditing(): void {
		this.highlighting = false;
		this.contentPre.style.display = "";
		this.contentDOM = this.contentPre.querySelector("code");
		const highlighted = this.codeContainer.querySelector(".code-block-highlighted");
		if (highlighted) highlighted.remove();
		this.dom.classList.remove("code-block-highlighted-state");
		this.dom.classList.add("code-block-editing-state");
	}

	private showHighlighting(): void {
		this.dom.classList.remove("code-block-editing-state");
		this.dom.classList.add("code-block-highlighted-state");
		this.scheduleHighlight();
	}

	private scheduleHighlight(): void {
		const code = getCodeText(this.node);
		const lang = extractLang(this.node.attrs.language) || "text";
		const dark = isDarkMode();

		const key = cacheKey(code, lang, dark);
		const cached = highlightCache.get(key);
		if (cached) {
			this.applyHighlight(cached);
			return;
		}

		highlightCode(code, lang, dark).then((html) => {
			if (highlightCache.size >= CACHE_MAX) {
				const firstKey = highlightCache.keys().next().value;
				if (firstKey !== undefined) highlightCache.delete(firstKey);
			}
			highlightCache.set(key, html);
			if (!this.selected) {
				this.applyHighlight(html);
			}
		}).catch(() => {
			this.contentPre.style.display = "";
		});
	}

	private applyHighlight(html: string): void {
		this.highlighting = true;
		const old = this.codeContainer.querySelector(".code-block-highlighted");
		if (old) old.remove();

		this.contentPre.style.display = "none";
		this.contentDOM = null;

		const wrapper = document.createElement("div");
		wrapper.className = "code-block-highlighted";
		wrapper.setAttribute("spellcheck", "false");
		wrapper.innerHTML = html;
		this.codeContainer.appendChild(wrapper);

		this.dom.classList.add("code-block-highlighted-state");
		this.dom.classList.remove("code-block-editing-state");
	}
}

export const codeBlockNodeViewPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("code-block-node-view"),
			props: {
				nodeViews: {
					code_block: (node, view, getPos) =>
						new CodeBlockView(node, view, getPos),
				},
			},
		}),
);
