const fs = require('fs');
const path = require('path');
const http = require('http');
const mime = require('mime');
const Plant = require('@plant/plant');
const accept = require('accept');
const isIp = require('is-ip');

const dnsBzzResolver = require('./lib/dns');
const {bzzStructureFetcher, bzzEntryFetcher} = require('./lib/bzz');
const cacheFactory = require('./lib/cache');
const Store = require('./lib/store');

process.on('uncaughtException', (error) => {
    console.error(error);
    process.exit(1);
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '8080';
const DNS = process.env.DNS || '8.8.8.8';
const BZZ = process.env.BZZ || 'http://swarm-gateways.net';

const getBzzRecord = dnsBzzResolver(DNS.split(/\s*,\s*/));
const fetchBzzStruct = bzzStructureFetcher(BZZ);
const fetchBzzEntry = bzzEntryFetcher(BZZ);
const store = new Store.Fs({dir: '/tmp/swarm-proxy'});
const bzzCache = cacheFactory(store);
const dnsCache = cacheFactory(new Store.Memory({lifetime: 15e3}));

const plant = new Plant();

plant.use(async ({req, res}) => {
    let {host} = req;

    if (isIp(host) || host === 'localhost') {
        return;
    }

    let bzz;
    if (await dnsCache.has(host)) {
        bzz = await dnsCache.get(host);
    }
    else {
        bzz = await getBzzRecord(host);
        await dnsCache.set(host, bzz);
    }

    let files;
    const cached = await bzzCache.get(bzz);

    if (! cached) {
        const entries = await fetchBzzStruct(bzz, {
            timeout: 10e3,
        });

        await bzzCache.set(bzz, entries);
        files = entries;
    }
    else {
        files = cached;
    }

    const file = findFileWithUrl(files, req.url);

    if (! file) {
        res.status(404);

        const types = accept.mediaTypes(req.headers.get('accept') || '');
        onType(types, {
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
    }
    else {
        res.status(200);
        let content;

        if (await store.has(file.hash)) {
            content = await store.get(file.hash);
        }
        else {
            content = await fetchBzzEntry(file.hash);
            store.set(file.hash, content);
        }

        res.headers.set('content-type', mime.getType(file.path));
        res.headers.set('content-length', file.size);
        res.send(content);
    }
});

const server = http.createServer(plant.handler());

server.listen(PORT, HOST, () => {
    console.log('Server started at %s: %s', HOST, PORT);
});

function findFileWithUrl(files, _url, {indexFile = 'index.html'} = {}) {
    const url = path.resolve('/', _url).slice(1);
    const search = [url, path.join(url, indexFile)];

    return files.find((file) => {
        return search.includes(file.path);
    });
}

function onType(types, _handlers) {
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
