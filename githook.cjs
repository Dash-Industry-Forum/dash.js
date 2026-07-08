const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');


const precommitTemplate = `#!/bin/sh
npm run lint
`;

let precommitFile;
try {
    precommitFile = path.resolve(__dirname, execFileSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
    }).trim());
} catch {
    // Not a git repository, or git is unavailable (e.g. installing dependencies
    // in CI or a Docker layer without the .git dir). The hook is a dev-only
    // convenience, so skip it rather than failing `npm install`.
    process.exit(0);
}
const pathToHooksFolder = path.dirname(precommitFile);

function writeHook(content) {
    fs.writeFile(precommitFile, content, { mode: 0o755 }, (err) => {
        if (err) throw err;
        fs.chmod(precommitFile, 0o755, (err) => {
            if (err) throw err;
            console.log(`${precommitFile} created.`);
        });
    });
}

fs.access(pathToHooksFolder, (err) => {
    if (err) {
        fs.mkdir(pathToHooksFolder, { recursive: true }, (err) => {
            if (err) throw err;
            writeHook(precommitTemplate);
        });
    } else {
        writeHook(precommitTemplate);
    }
});
