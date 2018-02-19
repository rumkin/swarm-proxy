const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const isRunning = require('is-running');
const http = require('http');

const PIDFILE = process.env.PID_FILE || 'proxy.pid';
const SOCKFILE = process.env.SOCK_FILE || 'run.sock';
const OUTLOG = 'log/access.log';
const ERRLOG = 'log/error.log';
const CMD = process.argv[2] || 'start';

process.on('uncaughtException', onError);

switch(CMD) {
    case 'start':
        start();
        break;
    case 'stop':
        stop();
        break;
    case 'status':
        status();
        break;
    case 'restart':
        restart();
        break;
    case 'reload':
        reload();
        break;
    case 'log':
        log();
        break;
    default:
        onError(`Unknown action: ${CMD}`);
}

function start() {
    if (fs.existsSync(PIDFILE)) {
        const pid = readPid(PIDFILE);

        if (isRunning(pid)) {
            onError('Process is running');
            return;
        }
    }

    const child = spawn(process.argv[0], [path.join(__dirname, '/run.js'), ...process.argv.slice(3)], {
        env: process.env,
        stdio: [
            'ignore',
            fs.openSync(OUTLOG, 'a'),
            fs.openSync(ERRLOG, 'a'),
        ],
        detached: true,
    });

    child.on('error', onError);

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

function restart() {
    stop();
    start();
}

function reload() {
    if (! fs.existsSync(SOCKFILE)) {
        throw new Error('Socket is not exists');
    }

    request({
        socketPath: SOCKFILE,
        host: 'localhost',
        path: '/reload',
    })
    .then((res) => {
        console.log('%o', res.data);
    })
    .catch(onError);
}

function log() {
    if (! fs.existsSync(SOCKFILE)) {
        throw new Error('Socket is not exists');
    }

    request({
        socketPath: SOCKFILE,
        host: 'localhost',
        path: '/log',
    })
    .then(({data}) => {
        data.forEach((item) => process.stdout.write(item));
    })
    .catch(onError);
}

function status() {
    if (! fs.existsSync(PIDFILE)) {
        console.log('Not running');
        return;
    }

    if (! fs.existsSync(SOCKFILE)) {
        console.log('Inactive');
        return;
    }

    request({
        socketPath: SOCKFILE,
        host: 'localhost',
        path: '/status',
    })
    .then(({data}) => {
        console.log('Running. Started at: %s', data);
    })
    .catch(onError);
}

function readPid(filepath) {
    return parseInt(fs.readFileSync(filepath, 'utf8'), 10);
}

function onError(error) {
    console.error(error);
    process.exit(1);
}

function request(options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(options);

        req.on('error', reject);
        req.on('response', (res) => {
            const data = [];

            res.on('error', reject);
            res.on('data', (chunk) => data.push(chunk))
            res.on('end', () => {
                try {
                    res.data = JSON.parse(Buffer.concat(data).toString('utf8'));
                }
                catch (err) {
                    reject(err);
                    return;
                }

                resolve(res);
            });
        });
        req.end();
    });
}
