export interface PluginFile {
  file: string;
  hash: string;
}

export interface PluginData {
  rules: PluginFile[];
  commands: PluginFile[];
  extensions: PluginFile[];
}

export interface Manifest {
  plugins: {
    [key: string]: PluginData;
  };
}

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
