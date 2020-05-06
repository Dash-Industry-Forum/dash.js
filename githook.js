const fs = require('fs');
const path = require('path');


const precommitTemplate = `#!/usr/bin/env node

var exec = require('child_process').exec;

exec('grunt lint', {
       cwd: '${__dirname}'
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

fs.mkdir(path.join(`${__dirname}`, '.git', 'hooks'), { recursive: true }, (err) => {
  if (err) throw err;
  const precommitFile = path.join(`${__dirname}`, '.git', 'hooks', 'pre-commit');
  fs.unlink(precommitFile, () => {
    fs.writeFile(precommitFile, precommitTemplate, { mode: 0o755 }, (err) => {
      if (err) throw err;
    });
  });
});