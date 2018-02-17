const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const isRunning = require('is-running');

const PIDFILE = process.env.PID_FILE || 'proxy.pid';
const CMD = process.argv[2] || 'start';

switch(CMD) {
    case 'start':
        start();
        break;
    case 'stop':
        stop();
        break;
    case 'restart':
        stop();
        start();
        break;
    default:
        console.error('Unknown action: %s', CMD);
        process.exit(1);
}

function start() {
    if (fs.existsSync(PIDFILE)) {
        const pid = readPid(PIDFILE);

        if (isRunning(pid)) {
            console.error('Process is running');
            process.exit(1);
            return;
        }
    }

    const child = spawn(process.argv[0], ['./run.js', ...process.argv.slice(3)], {
        env: process.env,
        stdio: 'ignore',
        detached: true,
    });

    child.on('error', (error) => {
        console.error(error);
        process.exit(1);
    });

    child.unref();
}

function stop() {
    if (! fs.existsSync(PIDFILE)) {
        return;
    }

    const pid = readPid(PIDFILE);

    if (isRunning(pid)) {
        process.kill(pid);
    }
}

function readPid(filepath) {
    return parseInt(fs.readFileSync(filepath, 'utf8'), 10);
}
