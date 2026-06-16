import { createHighlighter, type Highlighter } from "shiki";

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark";

let highlighterInstance: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
	if (highlighterInstance) return highlighterInstance;
	if (initPromise) return initPromise;

	initPromise = createHighlighter({
		themes: [LIGHT_THEME, DARK_THEME],
		langs: [],
	}).then((h) => {
		highlighterInstance = h;
		return h;
	});

	return initPromise;
}

async function ensureLanguage(lang: string): Promise<void> {
	const h = await getHighlighter();
	if (!h.getLoadedLanguages().includes(lang)) {
		await h.loadLanguage(lang as any);
	}
}

export function isDarkMode(): boolean {
	return document.documentElement.classList.contains("dark");
}

export async function highlightCode(
	code: string,
	lang: string,
	isDark: boolean,
): Promise<string> {
	const [h] = await Promise.all([getHighlighter(), ensureLanguage(lang)]);
	const theme = isDark ? DARK_THEME : LIGHT_THEME;

	return h.codeToHtml(code, { lang, theme });
}

export function getLangDisplayName(lang: string): string {
	if (!lang) return "text";
	const map: Record<string, string> = {
		js: "JavaScript",
		ts: "TypeScript",
		tsx: "TSX",
		jsx: "JSX",
		py: "Python",
		rb: "Ruby",
		rs: "Rust",
		go: "Go",
		kt: "Kotlin",
		java: "Java",
		cpp: "C++",
		c: "C",
		cs: "C#",
		sh: "Shell",
		bash: "Bash",
		sql: "SQL",
		html: "HTML",
		css: "CSS",
		scss: "SCSS",
		json: "JSON",
		yaml: "YAML",
		toml: "TOML",
		xml: "XML",
		md: "Markdown",
		pypython: "Python",
	};
	return map[lang] ?? lang.charAt(0).toUpperCase() + lang.slice(1);
}
