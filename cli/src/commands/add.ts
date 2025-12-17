import fs from "fs";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import { init } from "./init";
import { PLUGINS_DIR, MANIFEST_URL, BASE_CONTENT_URL } from "@config";
import { Manifest } from "@domain";

interface AddOptions {
  yes?: boolean;
  force?: boolean;
  dryRun?: boolean;
  list?: boolean;
  rules?: boolean;
  commands?: boolean;
  extensions?: boolean;
}

export async function add(plugins: string[], options: AddOptions) {
  let manifest: Manifest;
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok)
      throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    manifest = (await response.json()) as Manifest;
  } catch (error) {
    console.error(
      chalk.red(
        "Error: Unable to fetch plugin registry. Check your internet connection."
      )
    );
    if (options.dryRun) console.error(error);
    process.exit(1);
  }

  const availablePlugins = Object.keys(manifest.plugins);

  if (options.list) {
    console.log(chalk.bold("Available Plugins:"));
    availablePlugins.forEach((p) => console.log(`- ${p}`));
    return;
  }

  let selectedPlugins = plugins;
  if (selectedPlugins.length === 0) {
    const response = await prompts({
      type: "multiselect",
      name: "value",
      message: "Select plugins to install:",
      choices: availablePlugins.map((p) => ({ title: p, value: p })),
      hint: "- Space to select. Return to submit",
    });
    selectedPlugins = response.value;
  }

  if (!selectedPlugins || selectedPlugins.length === 0) {
    console.log(chalk.yellow("No plugins selected."));
    return;
  }

  const invalidPlugins = selectedPlugins.filter(
    (p) => !availablePlugins.includes(p)
  );
  if (invalidPlugins.length > 0) {
    console.error(
      chalk.red(`Error: Plugins not found: ${invalidPlugins.join(", ")}`)
    );
    console.log(
      `Run ${chalk.cyan(
        "gemini-templates add --list"
      )} to see available plugins.`
    );
    process.exit(1);
  }

  const installAll = !options.rules && !options.commands && !options.extensions;
  const components = {
    rules: installAll || options.rules,
    commands: installAll || options.commands,
    extensions: installAll || options.extensions,
  };

  const cwd = process.cwd();
  const geminiDir = path.join(cwd, ".gemini");
  const settingsPath = path.join(geminiDir, "settings.json");

  if (!fs.existsSync(settingsPath)) {
    console.log(
      chalk.yellow("\nProject not initialized. Running init first...")
    );
    await init({ yes: options.yes });
  }

  const agentDir = PLUGINS_DIR;

  for (const pluginName of selectedPlugins) {
    console.log(
      chalk.blue(`\nProcessing plugin: ${chalk.bold(pluginName)}...`)
    );
    const pluginData = manifest.plugins[pluginName];

    const processComponent = async (
      type: "rules" | "commands" | "extensions"
    ) => {
      if (!components[type]) return;

      const files = pluginData[type];
      if (!files || files.length === 0) return;

      const targetDir = path.join(agentDir, type, pluginName);
      if (!options.dryRun && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      for (const fileObj of files) {
        const fileName = fileObj.file;
        const expectedHash = fileObj.hash;

        const fileUrl = `${BASE_CONTENT_URL}/${pluginName}/${type}/${fileName}`;
        const destPath = path.join(targetDir, fileName);
        const relativeDest = path.relative(cwd, destPath);

        if (fs.existsSync(destPath) && !options.force) {
          console.log(
            chalk.yellow(
              `  ⚠ Skipped ${relativeDest} (already exists). Use --force to overwrite.`
            )
          );
          continue;
        }

        if (options.dryRun) {
          console.log(
            chalk.dim(
              `  [Dry Run] Would download ${fileUrl} to ${relativeDest}`
            )
          );
        } else {
          try {
            const res = await fetch(fileUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const crypto = require("crypto");
            const hashSum = crypto.createHash("sha256");
            hashSum.update(buffer);
            const actualHash = hashSum.digest("hex");

            if (actualHash !== expectedHash) {
              throw new Error(
                `Hash mismatch for ${fileName}. Expected ${expectedHash}, got ${actualHash}`
              );
            }

            fs.writeFileSync(destPath, buffer);
            console.log(chalk.green(`  ✔ Downloaded ${relativeDest}`));
          } catch (err: any) {
            console.error(
              chalk.red(`  ✘ Failed to download ${fileName}: ${err.message}`)
            );
            process.exit(1);
          }
        }
      }
    };

    await processComponent("rules");
    await processComponent("commands");
    await processComponent("extensions");
  }
}
