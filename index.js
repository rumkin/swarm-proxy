// const fs = require('fs');
const path = require('path');
const http = require('http');
const mime = require('mime');
const Plant = require('@plant/plant');
const accept = require('accept');
const isIp = require('is-ip');
const Sql = require('sequelize');
const dayjs = require('dayjs');

const dnsBzzResolver = require('./lib/dns');
const {bzzStructureFetcher, bzzEntryFetcher} = require('./lib/bzz');
const cacheFactory = require('./lib/cache');
// const statFactory = require('./lib/stat');
const plantOrigin = require('./lib/plant-origin');
const Store = require('./lib/store');

const V_2018_BETA = '2018:pre';

process.on('uncaughtException', onError);

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '8080';
const DNS = process.env.DNS || '8.8.8.8';
const BZZ = process.env.BZZ || 'http://swarm-gateways.net';
const API = process.env.API || null;
const STAT = process.env.STAT || null;
const DEV = process.env.DEV === '1';
const DB = process.env.DB || 'db.sqlite';

const getBzzRecord = dnsBzzResolver(DNS.split(/\s*,\s*/));
const fetchBzzStruct = bzzStructureFetcher(BZZ);
const fetchBzzEntry = bzzEntryFetcher(BZZ);
const store = new Store.Fs({dir: '/tmp/swarm-proxy'});
const bzzCache = cacheFactory(store);
const dnsCache = cacheFactory(new Store.Memory({lifetime: 15e3}));
// const stat = STAT ? statFactory(STAT) : null;
const sql = new Sql({
    dialect: 'sqlite',
    storage: DB,
    operatorsAliases: false,
});

const Stat = sql.define('stat', {
    host: {
        type: Sql.STRING,
        isNull: false,
    },
    time: {
        type: Sql.INTEGER,
        defaultValue: 0,
        isNull: false,
    },
    hits: {
        type: Sql.INTEGER,
        defaultValue: 0,
        isNull: false,
    },
    bytes: {
        type: Sql.INTEGER,
        defaultValue: 0,
        isNull: false,
    },
});

const apiRouter = new Plant.Router();

apiRouter.use(plantOrigin());

apiRouter.get('/stat', async ({res}) => {
    const lastDay = dayjs().startOf('hour').subtract(24, 'hours').unix();

    const statistics = await Stat.findAll({
        where: {
            time: {
                [Sql.Op.gte]: lastDay,
            },
        },
        attributes: [
            'host',
            [sql.fn('SUM', sql.col('hits')), 'hits'],
            [sql.fn('SUM', sql.col('bytes')), 'bytes'],
        ],
        group: ['host'],
    });

    res.json({statistics});
});

apiRouter.get('/swarm-record', async ({req, res}) => {
    const host = req.query.host;

    let swarm;
    if (await dnsCache.has(host)) {
        swarm = await dnsCache.get(host);
    }
    else {
        swarm = await getBzzRecord(host);
        await dnsCache.set(host, swarm);
    }

    res.json(swarm);
});

const plant = new Plant();

// Not found page handler
plant.use(async ({req, res}, next) => {
    await next();

    if (res.headersSent) {
        return;
    }

    res.status(404);

    onType(req, {
        ['application/json']() {
            res.json({
                error: {
                    code: 'not_found',
                },
            });
        },

        _() {
            res.send('Nothing found');
        },
    });
});

plant.use(async({req}, next) => {
    if (req.host === API) {
        await next();
    }
}, apiRouter);

if (DEV) {
    plant.use(async ({req, ...ctx}, next) => {
        await next({req, ...ctx, host: req.query.__host__});
    });
}
else {
    plant.use(async ({req, ...ctx}, next) => {
        await next({req, ...ctx, host: req.host});
    });
}

// Extract BZZ-TXT record from DNS
plant.use(async ({req, host, ...ctx}, next) => {
    if (isIp(host) || host === 'localhost') {
        return;
    }

    let swarm;
    if (await dnsCache.has(host)) {
        swarm = await dnsCache.get(host);
    }
    else {
        swarm = await getBzzRecord(host);
        await dnsCache.set(host, swarm);
    }

    if (! swarm) {
        return;
    }

    if (! swarm.bzz) {
        // TODO Throw invalid swarm-record error
        return;
    }

    await next({req, host, swarm, ...ctx});
});

// Get site tree from BZZ
plant.use(async ({swarm, ...ctx}, next) => {
    if (swarm.swarm !== V_2018_BETA) {
        return;
    }

    const cached = await bzzCache.get(swarm.bzz);
    let files;

    if (! cached) {
        const entries = await fetchBzzStruct(swarm.bzz, {
            timeout: 10e3,
        });

        await bzzCache.set(swarm.bzz, entries);
        files = entries;
    }
    else {
        files = cached;
    }

    await next({files, swarm, ...ctx});
});

if (STAT) { // Write host stat
    plant.use(async ({res, host}, next) => {
        await next();

        if (res.headersSent && res.statusCode === 200) {
            const time = dayjs().startOf('hour').unix();

            const counter = await Stat.findOne({
                where: {host, time},
            });

            const bytes = parseInt(res.headers.get('content-length'), 10);

            if (counter) {
                await counter.updateAttributes({
                    hits: sql.literal('`hits` + 1'),
                    bytes: sql.literal('`bytes` + ' + bytes),
                });
            }
            else {
                await Stat.create({
                    host,
                    time,
                    hits: 1,
                    bytes,
                });
            }
        }
    });
}

// Strict file handler
plant.use(async ({req, res, swarm, files}) => {
    let file;

    switch (swarm.type) {
        case 'spa':
            file = findFileWithUrl(files, req.url, {indexFile: 'index.html'});
            if (! file) {
                file = findFileWithUrl(files, '/index.html');
            }
            break;
        case 'website':
        default:
            file = findFileWithUrl(files, req.url, {indexFile: 'index.html'});
    }

    if (! file) {
        return;
    }

    await sendFile(res, file);
});

const server = http.createServer(plant.handler());

sql.sync()
.then(() => {
    server.listen(PORT, HOST, () => {
        console.log('Server started at %s: %s', HOST, PORT);
    });
})
.catch(onError);

// Helper methods

function findFileWithUrl(files, _url, {indexFile} = {}) {
    const url = path.resolve('/', _url).slice(1);
    const search = [url];

    if (indexFile) {
        search.push(path.join(url, indexFile));
    }

    return files.find((file) => {
        return search.includes(file.path);
    });
}

async function getFileByHash(hash) {
    if (await store.has(hash)) {
        return store.get(hash);
    }
    else {
        content = await fetchBzzEntry(hash);
        // TODO make defer
        await store.set(hash, content);

        return content;
    }
}

function onType(req, _handlers) {
    const types = accept.mediaTypes(req.headers.get('accept') || '');

    const handlers = {};
    for (const [type, fn] of Object.entries(_handlers)) {
        for (const t of type.split(/\s+/)) {
            handlers[t] = fn;
        }
    }

    for (const type of types) {
        if (type in handlers) {
            return handlers[type]();
        }
    }

    return handlers._();
}

async function sendFile(res, file) {
    const content = await getFileByHash(file.hash);

    res.status(200);
    res.headers.set('content-type', mime.getType(file.path));
    res.headers.set('content-length', file.size);
    res.headers.set('x-bzz-hash', `keccak-256 ${file.hash}`);
    res.send(content);
}

function onError(error) {
    console.error(error);
    process.exit(1);
}
