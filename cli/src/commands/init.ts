import fs from "fs";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";

export async function init(options: { yes?: boolean }) {
  const cwd = process.cwd();

  // --- Step 1: .gemini/settings.json ---
  const geminiDir = path.join(cwd, ".gemini");
  const settingsPath = path.join(geminiDir, "settings.json");

  if (!fs.existsSync(geminiDir)) {
    fs.mkdirSync(geminiDir, { recursive: true });
  }

  let settings: any = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, "utf-8");
      settings = JSON.parse(content);
    } catch (e) {
      console.error(
        chalk.red(
          "Error parsing existing .gemini/settings.json. Proceeding with empty settings."
        )
      );
    }
  }

  let newSettings = JSON.parse(JSON.stringify(settings));

  if (!newSettings.context) newSettings.context = {};
  if (!newSettings.context.fileName) newSettings.context.fileName = [];

  if (!Array.isArray(newSettings.context.fileName)) {
    newSettings.context.fileName = [newSettings.context.fileName];
  }

  const desiredFileNames = ["AGENTS.md", "GEMINI.md"];
  let changed = false;

  for (const name of desiredFileNames) {
    if (!newSettings.context.fileName.includes(name)) {
      newSettings.context.fileName.push(name);
      changed = true;
    }
  }

  if (changed) {
    const newContent = JSON.stringify(newSettings, null, 2);

    console.log(
      chalk.bold("\nConfiguration changes detected for .gemini/settings.json:")
    );
    console.log(
      chalk.gray("Current context.fileName: ") +
        chalk.red(JSON.stringify(settings.context?.fileName || []))
    );
    console.log(
      chalk.gray("New context.fileName:     ") +
        chalk.green(JSON.stringify(newSettings.context.fileName))
    );

    let shouldUpdate = options.yes;

    if (!shouldUpdate) {
      const response = await prompts({
        type: "confirm",
        name: "value",
        message: "Do you want to update .gemini/settings.json?",
        initial: true,
      });
      shouldUpdate = response.value;
    }

    if (shouldUpdate) {
      fs.writeFileSync(settingsPath, newContent);
      console.log(chalk.green("Updated .gemini/settings.json"));
    } else {
      console.log(chalk.yellow("Skipping settings update."));
    }
  } else {
    console.log(chalk.blue(".gemini/settings.json is already up to date."));
  }

  // --- Step 2: .agent/rules/AGENTS.md ---
  const agentRulesDir = path.join(cwd, ".agent", "rules");
  const agentsFile = path.join(agentRulesDir, "AGENTS.md");

  if (!fs.existsSync(agentRulesDir)) {
    fs.mkdirSync(agentRulesDir, { recursive: true });
  }

  const agentsContent = `---
trigger: always_on
---
`;

  if (!fs.existsSync(agentsFile)) {
    fs.writeFileSync(agentsFile, agentsContent);
    console.log(chalk.green(`\nCreated ${path.relative(cwd, agentsFile)}`));

    console.log(chalk.bold('\nNext Steps:'));
    console.log(`1. Open ${chalk.cyan(path.relative(cwd, agentsFile))} and add your project-specific instructions.`);
    console.log('   This file acts as a global context (trigger: always_on), so Gemini will understand your project\'s rules and style in every interaction.');
  } else {
    console.log(
      chalk.blue(
        `\n${path.relative(cwd, agentsFile)} already exists. Skipping creation.`
      )
    );
  }
}
