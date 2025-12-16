import {
  IValidator,
  ValidationContext,
  ValidationResult,
} from "../interfaces/IValidator";
import * as yaml from "js-yaml";

const ALLOWED_TAGS = [
  "role",
  "instructions",
  "constraints",
  "context",
  "task",
  "output_format",
  "final_instruction",
];

const ALLOWED_TRIGGERS = ["manual", "model_decision", "always_on"];
const MAX_FILE_SIZE = 1024 * 1024;
const MAX_BODY_LENGTH = 12000;

export class StructureValidator implements IValidator {
  name = "StructureValidator";

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (context.content.length > MAX_FILE_SIZE) {
      result.valid = false;
      result.errors.push(`File size exceeds limit of 1MB.`);
      return result;
    }

    const match = context.content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      result.valid = false;
      result.errors.push("Missing frontmatter");
      return result;
    }

    const frontmatterRaw = match[1];
    let frontmatter: any;
    try {
      frontmatter = yaml.load(frontmatterRaw);
      if (typeof frontmatter !== "object" || frontmatter === null) {
        throw new Error("Frontmatter is not an object");
      }
    } catch (e) {
      result.valid = false;
      result.errors.push(`Invalid YAML in frontmatter: ${e}`);
      return result;
    }

    if (!frontmatter.trigger) {
      result.valid = false;
      result.errors.push('Missing required key "trigger"');
    } else if (!ALLOWED_TRIGGERS.includes(frontmatter.trigger)) {
      result.valid = false;
      result.errors.push(
        `Invalid trigger value "${
          frontmatter.trigger
        }". Allowed: ${ALLOWED_TRIGGERS.join(", ")}`
      );
    }

    if (frontmatter.trigger === "model_decision" && !frontmatter.description) {
      result.valid = false;
      result.errors.push(
        'Missing required key "description" (required when trigger is "model_decision")'
      );
    }

    if (frontmatter.description && frontmatter.description.length > 250) {
      result.valid = false;
      result.errors.push(
        `Description is too long (${frontmatter.description.length} chars). Max 250.`
      );
    }

    const body = context.content.substring(match[0].length);

    if (body.trim().length > MAX_BODY_LENGTH) {
      result.valid = false;
      result.errors.push(
        `Body content exceeds ${MAX_BODY_LENGTH} characters (current: ${
          body.trim().length
        }).`
      );
    }

    this.validateXMLTags(body, result);

    if (result.errors.length > 0) {
      result.valid = false;
    }

    return result;
  }

  private validateXMLTags(content: string, result: ValidationResult) {
    let cleanContent = content.replace(/```[\s\S]*?```/g, "");
    cleanContent = cleanContent.replace(/`[^`]*`/g, "");

    const tagRegex = /<\/?([a-zA-Z0-9_]+)(?:\s+[^>]*)?>/g;

    let match;
    while ((match = tagRegex.exec(cleanContent)) !== null) {
      const tagName = match[1];
      if (!ALLOWED_TAGS.includes(tagName)) {
        if (
          !result.errors.some((e) =>
            e.includes(`Invalid XML tag found: <${tagName}>`)
          )
        ) {
          result.errors.push(
            `Invalid XML tag found: <${tagName}>. Allowed: ${ALLOWED_TAGS.join(
              ", "
            )}`
          );
        }
      }
    }
  }
}
