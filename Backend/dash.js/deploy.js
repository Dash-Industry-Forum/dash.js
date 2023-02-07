const argv = require('yargs').argv;
const path = require('path');
const child = require('child_process');
const replace = require('replace-in-file');
const FtpDeploy = require("ftp-deploy");
const ftpDeploy = new FtpDeploy();

function execSync(command) {
    // console.info('Exec command: ' + command);
    var res = child.execSync(command);
    res = String(res).trim();
    return res;
}

// Replace <!-- commit-info --> in samples/dash-if-reference-player/index.html with git branch and commit
var branch = execSync('git rev-parse --abbrev-ref HEAD');
var hash = execSync('git rev-parse HEAD');

var str = `(${branch}, commit: <a href="https://github.com/Dash-Industry-Forum/dash.js/commit/${hash}">${hash.substring(0, 8)}</a>)`;

try {
    replace.sync({
        files: 'samples/dash-if-reference-player/index.html',
        from: '<!-- commit-info -->',
        to: str
    });
} catch (e) {
    console.error('Failed to replace git info: ', e);
    process.exit(1);
}

// Push files ont ftp server
var config = {
    user: argv.user,
    password: argv.password,
    host: argv.host,
    port: argv.port,
    localRoot: __dirname,
    remoteRoot: '/',
     include: [
        'contrib/**',
        'dist/**',
        'test/functional/tests.html',
        'test/functional/testsCommon.js',
        'test/functional/config/**',
        'test/functional/tests/**',
        'samples/**'
    ],
    // delete ALL existing files at destination before uploading, if true
    deleteRemote: false,
    // Passive mode is forced (EPSV command is not sent)
    forcePasv: true,
    // use sftp or ftp
    sftp: false
};

ftpDeploy
    .deploy(config)
    .then(res => console.log("finished:", res))
    .catch(err => {
        console.log(err);
        process.exit(1);
    });



