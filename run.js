const fs = require('fs');
const path = require('path');
const http = require('http');
const {spawn} = require('child_process');
const {Writable} = require('stream');
const Plant = require('@plant/plant');

const PIDFILE = process.env.PID_FILE || 'proxy.pid';
const SOCKFILE = process.env.SOCK_FILE || 'run.sock';
const DELAY = 500;
const startDate = new Date();

let isStopped = false;
let subproc;
let timeout;
let server;

function clean() {
    if (fs.existsSync(PIDFILE)) {
        fs.unlinkSync(PIDFILE);
    }

    if (fs.existsSync(SOCKFILE)) {
        fs.unlinkSync(SOCKFILE);
    }
}

function stop(signal) {
    subproc.kill(signal);

    timeout = setTimeout(() => {
        process.exit();
    }, 1000);
}

function exit(signal) {
    isStopped = true;

    server.close();

    if (subproc) {
        stop(signal);
    } else {
        process.exit();
    }
}

let log = [];

function run() {
    subproc = spawn(process.argv[0], [path.join(__dirname, 'index.js'), process.argv.slice(2)], {
        env: process.env,
        stdio: [null, 'pipe', 'pipe'],
    });

    subproc.on('close', () => {
        subproc = null;
        clearTimeout(timeout);

        if (! isStopped) {
            run();
        }
    });

    subproc.stdout.pipe(new Writable({
        write(chunk, enc, done) {
            process.stdout.write(chunk);
            logWrite(chunk);
            done();
        },
    }));

    subproc.stderr.pipe(new Writable({
        write(chunk, enc, done) {
            process.stderr.write(chunk);
            logWrite(chunk);
            done();
        },
    }));
}

function logWrite(chunk) {
    log.push(chunk.toString('utf8'));

    if (log.length > 1024) {
        log = log.slice(-1024);
    }
}

process.on('exit', clean);
process.on('SIGINT', exit);
process.on('SIGTERM', exit);

const plant = new Plant();
const router = new Plant.Router();

router.get('/reload', ({res}) => {
    subproc.kill('SIGINT');
    res.json(true);
});

router.get('/log', ({res}) => {
    res.json(log, true);
});

router.get('/status', ({res}) => {
    res.json(startDate.toISOString(), true);
});

plant.use(router);

server = http.createServer(plant.handler());

if (fs.existsSync(SOCKFILE)) {
    fs.unlinkSync(SOCKFILE);
}

server.listen(SOCKFILE, () => {
    console.log('Server is listening: %s', path.resolve(SOCKFILE));
    fs.chmodSync(SOCKFILE, 0770);
});

fs.writeFileSync(PIDFILE, process.pid);

run();
