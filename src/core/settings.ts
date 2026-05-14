export interface AiProviderConfig {
  name: string;
  url: string;
  apiKey: string;
  model: string;
}

export interface DocxPluginSettings {
  fontSize: number;
  lineSpacing: number;
  firstLineIndent: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  chapterFontSize: number;
  chapterBold: boolean;
  chapterAlignment: string;
  chapterIndent: boolean;
  paragraphFontSize: number;
  paragraphBold: boolean;
  paragraphAlignment: string;
  paragraphIndent: boolean;
  chapterPrefix: boolean;
  paragraphDot: boolean;
  chapterAllCaps: boolean;
  chapterDot: boolean;
  saveFormat: string;
  defaultImageSize: string;
  imageShortCaption: boolean;
  imageCaptionSeparator: string;
  imageNumbering: string;
  linksAtEndOfSentence: boolean;
  skipBibliography: boolean;
  aiProviders: AiProviderConfig[];
  aiActiveProvider: number;
  aiSystemPromptFull: string;
  aiSystemPromptPartial: string;
}

export const DEFAULT_SETTINGS: DocxPluginSettings = {
  fontSize: 14,
  lineSpacing: 1.5,
  firstLineIndent: 1.25,
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 30,
  marginRight: 20,
  chapterFontSize: 16,
  chapterBold: true,
  chapterAlignment: "center",
  chapterIndent: false,
  paragraphFontSize: 14,
  paragraphBold: true,
  paragraphAlignment: "justified",
  paragraphIndent: false,
  chapterPrefix: false,
  paragraphDot: true,
  chapterAllCaps: false,
  chapterDot: true,
  saveFormat: "doc",
  defaultImageSize: "80%",
  imageShortCaption: false,
  imageCaptionSeparator: "dot",
  imageNumbering: "sequential",
  linksAtEndOfSentence: false,
  skipBibliography: false,
  aiProviders: [
    { name: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", apiKey: "", model: "z-ai/glm-4.5-air:free" },
    { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", apiKey: "", model: "qwen/qwen3-32b" },
  ],
  aiActiveProvider: 0,
  aiSystemPromptFull: "",
  aiSystemPromptPartial: "",
};
