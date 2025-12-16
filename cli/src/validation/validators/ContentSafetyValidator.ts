import {
  IValidator,
  ValidationContext,
  ValidationResult,
} from "../interfaces/IValidator";

export class ContentSafetyValidator implements IValidator {
  name = "ContentSafetyValidator";

  private blockingPatterns = [
    { pattern: /rm\s+-rf/, message: 'Destructive command "rm -rf" detected' },
    { pattern: /mkfs/, message: 'Destructive command "mkfs" detected' },
    {
      pattern: /:\(\)\{\s*:\|:\s*&\s*\}\s*;?\s*:/,
      message: "Fork bomb pattern detected",
    },
    { pattern: /(wget|curl)\s+.*\|\s*bash/, message: "Pipe to bash detected" },
    { pattern: /<script[\s>]/i, message: "<script> tag detected" },
    { pattern: /<iframe[\s>]/i, message: "<iframe> tag detected" },
    { pattern: /<object[\s>]/i, message: "<object> tag detected" },
    { pattern: /javascript:/i, message: '"javascript:" URI detected' },
    {
      pattern: /\bon\w+\s*=/i,
      message: "HTML event handler (e.g., onclick) detected",
    },
    {
      pattern: /Ignore all previous instructions/i,
      message: 'Possible Prompt Injection: "Ignore all previous instructions"',
    },
    {
      pattern: /System override/i,
      message: 'Possible Prompt Injection: "System override"',
    },
    {
      pattern: /You are now \[.*\]/i,
      message: "Possible Prompt Injection: Role hijacking",
    },
  ];

  private warningPatterns = [
    { pattern: /eval\(/, message: 'Suspicious code pattern "eval(" detected' },
    { pattern: /exec\(/, message: 'Suspicious code pattern "exec(" detected' },
    {
      pattern: /child_process/,
      message: 'Suspicious usage of "child_process" detected',
    },
    {
      pattern: /\/etc\/passwd/,
      message: 'Reference to sensitive file "/etc/passwd" detected',
    },
    {
      pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/,
      message: "Potential Private Key detected",
    },
    {
      pattern: /AKIA[0-9A-Z]{16}/,
      message: "Potential AWS Access Key detected",
    },
  ];

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const content = context.content;

    for (const check of this.blockingPatterns) {
      if (check.pattern.test(content)) {
        result.valid = false;
        result.errors.push(
          `Potentially malicious pattern detected: ${check.message}`
        );
      }
    }

    for (const check of this.warningPatterns) {
      if (check.pattern.test(content)) {
        if (!result.warnings) result.warnings = [];
        result.warnings.push(`Suspicious code pattern: ${check.message}`);
      }
    }

    return result;
  }
}
