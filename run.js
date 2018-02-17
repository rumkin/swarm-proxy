const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const PIDFILE = process.env.PID_FILE || 'proxy.pid';
const DELAY = 500;

let isStopped = false;
let subproc;
let timeout;

function clean() {
    fs.unlinkSync(PIDFILE);
}

function exit(signal) {
    isStopped = true;

    if (subproc) {
        subproc.kill(signal);
        timeout = setTimeout(() => {
            process.exit()
        }, 1000);
    } else {
        process.exit();
    }
}

function run() {
    subproc = spawn(process.argv[0], ['index.js', process.argv.slice(2)], {
        env: process.env,
        stdio: [null, process.stdout, process.stderr],
    });

    subproc.on('close', () => {
        subproc = null;
        clearTimeout(timeout);

        if (! isStopped) {
            run();
        }
    });
}

process.on('exit', clean);
process.on('SIGINT', exit);
process.on('SIGTERM', exit);

fs.writeFileSync(PIDFILE, process.pid);

run();
