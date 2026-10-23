const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Git runs hooks from the root of the current working tree, so this lints whichever worktree is committing
// Fresh worktrees have no node_modules yet, so skip instead of blocking the commit (CI lints anyway)
const precommitTemplate = `#!/bin/sh

if [ ! -f node_modules/.bin/eslint ]; then
    echo "pre-commit: eslint not installed, skipping lint. Run npm ci to enable it."
    exit 0
fi
exec npm run lint
`;

let commonDir, prefix;
try {
    // --git-common-dir resolves to the main .git folder, also when called from a git worktree where .git is a file.
    // --show-prefix is empty when called from the root of the repository.
    [commonDir, prefix] = execFileSync('git', ['rev-parse', '--git-common-dir', '--show-prefix'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().split('\n');
} catch (e) {
    console.log('Not a git repository, skipping pre-commit hook installation.');
    process.exit(0);
}

// Don't touch the hooks of an outer repository that dash.js happens to live in
if (prefix) {
    console.log('dash.js is not the root of its git repository, skipping pre-commit hook installation.');
    process.exit(0);
}

// Write to .git/hooks even if core.hooksPath is set, so a shared hooks folder is never overwritten
const pathToHooksFolder = path.join(path.resolve(__dirname, commonDir), 'hooks');

fs.mkdirSync(pathToHooksFolder, { recursive: true });
// Remove the helper script used by older versions of this hook
fs.rmSync(path.join(pathToHooksFolder, 'pre-commit.cjs'), { force: true });
const precommitFile = path.join(pathToHooksFolder, 'pre-commit');
fs.writeFileSync(precommitFile, precommitTemplate, { mode: 0o755 });
console.log(`${precommitFile} created.`);
