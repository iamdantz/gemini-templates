export interface ValidationContext {
  content: string;
  filePath: string;
  // We can add more context here later, e.g. "parsedFrontmatter" to share between validators
  // but for now let's keep it decoupled.
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface IValidator {
  name: string;
  validate(context: ValidationContext): Promise<ValidationResult>;
}
