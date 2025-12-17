import path from "path";
import fs from "fs";
import chalk from "chalk";
import { ValidationOrchestrator } from "../validation/ValidationOrchestrator";
import { StructureValidator } from "../validation/validators/StructureValidator";
import { ContentSafetyValidator } from "../validation/validators/ContentSafetyValidator";
import { ValidationContext } from "../validation/interfaces/IValidator";
import { PLUGINS_DIR } from "../config";

function getAllRuleFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const IGNORED_DIRS = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".husky",
    "coverage",
  ];

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        results = results.concat(getAllRuleFiles(filePath));
      }
    } else {
      if (file.endsWith(".md")) {
        results.push(filePath);
      }
    }
  });
  return results;
}

import { IntegrityValidator } from "../validation/validators/IntegrityValidator";

export async function validate(args: string[], options: { path?: string }) {
  console.log(chalk.blue("Starting Validation..."));

  const targetDir = options.path ? path.resolve(options.path) : PLUGINS_DIR;

  if (!fs.existsSync(targetDir)) {
    console.log(
      chalk.yellow("No installed plugins found. Nothing to validate.")
    );
    return;
  }

  const allFiles = getAllRuleFiles(targetDir);

  const files = allFiles.filter((filePath) => {
    const relPath = path.relative(targetDir, filePath);
    const parts = relPath.split(path.sep);

    if (parts.some((p) => ["rules", "commands", "extensions"].includes(p))) {
      return true;
    }

    const targetBasename = path.basename(targetDir);
    if (["rules", "commands", "extensions"].includes(targetBasename)) {
      return true;
    }

    return false;
  });

  if (files.length === 0) {
    console.log(
      chalk.yellow("No files found to validate in target directory.")
    );
    return;
  }

  console.log(chalk.cyan(`Found ${files.length} files to validate.`));

  const validators = [
    new StructureValidator(),
    new ContentSafetyValidator(),
    new IntegrityValidator(targetDir),
  ];
  const orchestrator = new ValidationOrchestrator(validators);

  const contexts: ValidationContext[] = files.map((filePath) => ({
    content: fs.readFileSync(filePath, "utf8"),
    filePath,
  }));

  const results = await orchestrator.run(contexts);

  let hasErrors = false;

  results.forEach((result, index) => {
    const filePath = files[index];

    if (!result.valid) {
      hasErrors = true;
      console.error(
        chalk.red(`\n[FAIL] ${path.relative(process.cwd(), filePath)}`)
      );
      result.errors.forEach((err) => console.error(chalk.red(`  - ${err}`)));
    }

    if (result.warnings && result.warnings.length > 0) {
      console.warn(
        chalk.yellow(`\n[WARN] ${path.relative(process.cwd(), filePath)}`)
      );
      result.warnings.forEach((warn) =>
        console.warn(chalk.yellow(`  - ${warn}`))
      );
    }
  });

  if (hasErrors) {
    console.error(chalk.red("\nValidation failed with errors."));
    process.exit(1);
  } else {
    console.log(chalk.green("\nValidation passed successfully."));
  }
}
