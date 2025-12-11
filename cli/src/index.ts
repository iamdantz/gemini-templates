#!/usr/bin/env node
import cac from 'cac';
import { init } from './commands/init';
import { version } from '../package.json';

const cli = cac('gemini-templates');

cli
  .command('init', 'Initialize Gemini Templates structure')
  .option('--yes', 'Skip confirmation')
  .action((options) => {
      init(options);
  });

cli.help();
cli.version(version);

cli.parse();
