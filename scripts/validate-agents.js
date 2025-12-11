const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '../plugins');
const ALLOWED_TAGS = [
    'role',
    'instructions',
    'constraints',
    'context',
    'task',
    'output_format',
    'final_instruction'
];

const ALLOWED_TRIGGERS = ['manual', 'model_decision', 'always_on'];

let hasErrors = false;

function error(file, message) {
    console.error(`[ERROR] ${file}: ${message}`);
    hasErrors = true;
}

function getAllRuleFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllRuleFiles(filePath));
        } else {
            // Check if it's in a 'rules' directory and is a markdown file
            if (path.basename(path.dirname(filePath)) === 'rules' && file.endsWith('.md')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

function validateFrontmatter(content, filePath) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
        error(filePath, 'Missing frontmatter');
        return null;
    }

    const frontmatterRaw = match[1];
    const lines = frontmatterRaw.split('\n');
    const frontmatter = {};
    
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            // Store exact key to check casing
            frontmatter[key] = value;
        }
    });

    // 1. Check mandatory keys
    if (!Object.prototype.hasOwnProperty.call(frontmatter, 'trigger')) {
        error(filePath, 'Missing required key "trigger"');
    }

    // Description is mandatory only if trigger is 'model_decision'
    if (frontmatter.trigger === 'model_decision' && !Object.prototype.hasOwnProperty.call(frontmatter, 'description')) {
        error(filePath, 'Missing required key "description" (required when trigger is "model_decision")');
    }

    // 2. Check description length
    if (frontmatter.description && frontmatter.description.length > 250) {
        error(filePath, `Description is too long (${frontmatter.description.length} chars). Max 250.`);
    }

    // 3. Check trigger options
    if (frontmatter.trigger && !ALLOWED_TRIGGERS.includes(frontmatter.trigger)) {
        error(filePath, `Invalid trigger value "${frontmatter.trigger}". Allowed: ${ALLOWED_TRIGGERS.join(', ')}`);
    }

    return match[0].length; // Return length of frontmatter to skip it
}

function validateXMLTags(content, filePath) {
    // Remove code blocks to avoid false positives
    let cleanContent = content.replace(/```[\s\S]*?```/g, '');
    cleanContent = cleanContent.replace(/`[^`]*`/g, '');

    // Regex to find XML tags: <tag> or </tag>
    // We want to capture the tag name
    const tagRegex = /<\/?([a-zA-Z0-9_]+)(?:\s+[^>]*)?>/g;
    
    let match;
    while ((match = tagRegex.exec(cleanContent)) !== null) {
        const tagName = match[1];
        if (!ALLOWED_TAGS.includes(tagName)) {
            error(filePath, `Invalid XML tag found: <${tagName}>. Allowed: ${ALLOWED_TAGS.join(', ')}`);
        }
    }
}

function run() {
    console.log('Starting Agent Validation...');
    const files = getAllRuleFiles(pluginsDir);
    
    if (files.length === 0) {
        console.log('No rule files found.');
        return;
    }

    files.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const frontmatterEndIndex = validateFrontmatter(content, filePath);
        
        if (frontmatterEndIndex !== null) {
            const body = content.substring(frontmatterEndIndex);
            validateXMLTags(body, filePath);
        }
    });

    if (hasErrors) {
        console.error('\nValidation failed with errors.');
        process.exit(1);
    } else {
        console.log('\nValidation passed successfully.');
    }
}

run();
