import { ValidationContext, ValidationResult } from "@domain";

export { ValidationContext, ValidationResult };

export interface IValidator {
  name: string;
  validate(context: ValidationContext): Promise<ValidationResult>;
}
