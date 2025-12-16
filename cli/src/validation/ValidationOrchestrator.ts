import {
  IValidator,
  ValidationContext,
  ValidationResult,
} from "./interfaces/IValidator";

export class ValidationOrchestrator {
  constructor(private validators: IValidator[]) {}

  async run(contexts: ValidationContext[]): Promise<ValidationResult[]> {
    return Promise.all(
      contexts.map(async (context) => {
        const aggregatedResult: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
        };

        const results = await Promise.all(
          this.validators.map((validator) => validator.validate(context))
        );

        for (const result of results) {
          if (!result.valid) {
            aggregatedResult.valid = false;
            aggregatedResult.errors.push(...result.errors);
          }
          if (result.warnings) {
            aggregatedResult.warnings?.push(...result.warnings);
          }
        }

        return aggregatedResult;
      })
    );
  }
}
