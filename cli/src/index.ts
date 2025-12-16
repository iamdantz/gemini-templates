#!/usr/bin/env node
import cac from "cac";
import { init } from "./commands/init";
import { add } from "./commands/add";
import { version } from "../package.json";

const cli = cac("gemini-templates");

cli
  .command("init", "Initialize Gemini Templates structure")
  .option("--yes", "Skip confirmation")
  .action((options) => {
    init(options);
  });

cli
  .command("add [...plugins]", "Add plugins to the project")
  .alias("install")
  .option("--yes, -y", "Skip confirmation")
  .option("--force, -f", "Overwrite existing files")
  .option("--dry-run", "Simulate without changes")
  .option("--list, -l", "List available plugins")
  .option("--rules", "Install only rules")
  .option("--commands", "Install only commands")
  .option("--extensions", "Install only extensions")
  .action((plugins, options) => {
    add(plugins || [], options);
  });

cli
  .command("validate", "Validate installed plugins")
  .option("--path <dir>", "Path to plugins directory")
  .action((options) => {
    const { validate } = require("./commands/validate");
    validate([], options);
  });

cli.help();
cli.version(version);

cli.parse();
