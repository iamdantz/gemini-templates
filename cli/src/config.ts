import path from "path";

export const PLUGINS_DIR = path.join(process.cwd(), ".agent");

export const GEMINI_VERSION = process.env.GEMINI_VERSION || "main";

export const MANIFEST_URL = process.env.GEMINI_MANIFEST_URL as string;

export const BASE_CONTENT_URL = process.env.GEMINI_PLUGINS_URL as string;
