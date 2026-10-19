const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Git runs hooks from the root of the current working tree, so this lints whichever worktree is committing
const precommitTemplate = `#!/bin/sh

exec npm run lint
`;

let pathToHooksFolder;
try {
    // Resolves to the shared hooks folder, also when called from a git worktree where .git is a file
    pathToHooksFolder = path.resolve(__dirname, execSync('git rev-parse --git-path hooks', { cwd: __dirname }).toString().trim());
} catch (e) {
    console.log('Not a git repository, skipping pre-commit hook installation.');
    return;
}

fs.mkdirSync(pathToHooksFolder, { recursive: true });
// Remove the helper script used by older versions of this hook
fs.rmSync(path.join(pathToHooksFolder, 'pre-commit.cjs'), { force: true });
const precommitFile = path.join(pathToHooksFolder, 'pre-commit');
fs.writeFileSync(precommitFile, precommitTemplate, { mode: 0o755 });
console.log(`${precommitFile} created.`);
