export interface ValidationContext {
  content: string;
  filePath: string;
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
