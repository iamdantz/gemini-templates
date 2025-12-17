import path from "path";

export const PLUGINS_DIR = path.join(process.cwd(), ".agent");
export const MANIFEST_URL = process.env.GEMINI_MANIFEST_URL as string;
