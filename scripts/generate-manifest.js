const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pluginsDir = path.join(__dirname, '../plugins');
const manifestPath = path.join(pluginsDir, 'manifest.json');

const getFileHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
};

const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.md'))
        .map(file => ({
            file,
            hash: getFileHash(path.join(dir, file))
        }));
};

const generateManifest = () => {
    const manifest = {
        plugins: {}
    };

    if (!fs.existsSync(pluginsDir)) {
        console.error('Plugins directory not found');
        process.exit(1);
    }

    const plugins = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    plugins.forEach(pluginName => {
        const pluginPath = path.join(pluginsDir, pluginName);
        
        manifest.plugins[pluginName] = {
            rules: getFiles(path.join(pluginPath, 'rules')),
            commands: getFiles(path.join(pluginPath, 'commands')),
            extensions: getFiles(path.join(pluginPath, 'extensions'))
        };
    });

    const sortedManifest = {
        plugins: Object.keys(manifest.plugins).sort().reduce((acc, key) => {
            acc[key] = manifest.plugins[key];
            return acc;
        }, {})
    };

    fs.writeFileSync(manifestPath, JSON.stringify(sortedManifest, null, 2));
    console.log(`Manifest generated at ${manifestPath}`);
};

generateManifest();
