const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');


const precommitTemplate = `#!/usr/bin/env node

var exec = require('child_process').exec;

exec('npm run lint', {
       cwd: '${__dirname.toString().replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'
     }, function (err, stdout, stderr) {

  var exitCode = 0;
  if (err) {
    console.log(stderr || err);
    exitCode = -1;
  }

  process.exit(exitCode);
}).stdout.on('data', function (chunk){
    process.stdout.write(chunk);
});
`;

const precommitFile = path.resolve(__dirname, execFileSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], {
    cwd: __dirname,
    encoding: 'utf8'
}).trim());
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
