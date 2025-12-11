const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '../plugins');
const manifestPath = path.join(pluginsDir, 'manifest.json');

const getFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => file.endsWith('.md'));
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
