import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

const CLI_PATH = path.join(__dirname, '../src/index.ts');
const CWD = process.cwd();
const TEST_DIR = path.join(CWD, 'test-playground');

describe('CLI Integration Tests', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR);
    }
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.rmSync(path.join(TEST_DIR, '.gemini'), { recursive: true, force: true });
    fs.rmSync(path.join(TEST_DIR, '.agent'), { recursive: true, force: true });
  });

  it('should initialize the project with "init"', async () => {
    const { stdout } = await execa('npx', ['ts-node', CLI_PATH, 'init', '--yes'], {
      cwd: TEST_DIR,
    });

    expect(stdout).toContain('Updated .gemini/settings.json');
    expect(fs.existsSync(path.join(TEST_DIR, '.gemini/settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, '.agent/rules/AGENTS.md'))).toBe(true);
  });

  it('should auto-initialize and add a plugin with "add"', async () => {
    expect(fs.existsSync(path.join(TEST_DIR, '.gemini/settings.json'))).toBe(false);

    const { stdout } = await execa('npx', ['ts-node', CLI_PATH, 'add', 'terraform', '--yes'], {
      cwd: TEST_DIR,
    });

    expect(stdout).toContain('Project not initialized. Running init first...');

    expect(stdout).toContain('Downloaded .agent/rules/terraform/terraform-specialist.md');

    expect(fs.existsSync(path.join(TEST_DIR, '.gemini/settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, '.agent/rules/terraform/terraform-specialist.md'))).toBe(true);
  }, 30000);
});
