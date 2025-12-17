import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  IValidator,
  ValidationContext,
  ValidationResult,
} from "../interfaces/IValidator";
import { MANIFEST_URL } from "../../config";

interface Manifest {
  plugins: {
    [key: string]: {
      rules: { file: string; hash: string }[];
      commands: { file: string; hash: string }[];
      extensions: { file: string; hash: string }[];
    };
  };
}

export class IntegrityValidator implements IValidator {
  name = "IntegrityValidator";
  private manifestPromise: Promise<Manifest> | null = null;
  private manifest: Manifest | null = null;

  constructor(private targetDir: string) {}

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      const manifest = await this.getManifest();

      const fileInfo = this.resolvePluginInfo(context.filePath);
      if (!fileInfo) {
        return result;
      }

      const { pluginName, type, fileName } = fileInfo;

      if (type !== "rules" && type !== "commands" && type !== "extensions") {
        return result;
      }

      const pluginData = manifest.plugins[pluginName];
      if (!pluginData) {
        return result;
      }

      // @ts-ignore
      const filesDef = pluginData[type] as { file: string; hash: string }[];
      const fileDef = filesDef?.find((f) => f.file === fileName);

      if (!fileDef) {
        return result;
      }

      const expectedHash = fileDef.hash;
      const actualHash = this.calculateHash(context.filePath);

      if (actualHash !== expectedHash) {
        result.valid = false;
        result.errors.push(
          `Integrity check failed. Expected: ${expectedHash}, Actual: ${actualHash}`
        );
      }
    } catch (error: any) {
      result.valid = false;
      result.errors.push(`Integrity validation error: ${error.message}`);
    }

    return result;
  }

  private async getManifest(): Promise<Manifest> {
    if (this.manifest) return this.manifest;
    if (this.manifestPromise) return this.manifestPromise;

    this.manifestPromise = fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Manifest>;
      })
      .then((data) => {
        this.manifest = data;
        return data;
      });

    return this.manifestPromise;
  }

  private resolvePluginInfo(
    filePath: string
  ): { pluginName: string; type: string; fileName: string } | null {
    const relPath = path.relative(this.targetDir, filePath);
    const parts = relPath.split(path.sep);

    // Expected structure: type/pluginName/fileName
    // e.g. rules/my-plugin/rule.md
    if (parts.length < 3) return null;

    const type = parts[0];
    const pluginName = parts[1];
    // FileName might be deeper? standard structure seems flat in previous code
    // "const filePath = path.join(installedPluginDir, fileName);" -> type/pluginName/fileName
    // But fileName could technically be a path if zip had folders?
    // The manifest has "file: string", typically usually basename.
    // Let's assume standard structure: everything after pluginName is the file relative path.
    const fileName = parts.slice(2).join(path.sep);

    return { pluginName, type, fileName };
  }

  private calculateHash(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(buffer);
    return hashSum.digest("hex");
  }
}
