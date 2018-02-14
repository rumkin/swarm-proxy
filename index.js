const path = require('path');
const http = require('http');
const mime = require('mime');
const Plant = require('@plant/plant');
const accept = require('accept');

const dnsBzzResolver = require('./lib/dns');
const {bzzStructureFetcher, bzzEntryFetcher} = require('./lib/bzz');
const cacheFactory = require('./lib/cache');
const FsStore = require('./lib/store');

const BZZ_GATEWAY = 'http://swarm-gateways.net';

const getBzzRecord = dnsBzzResolver(['8.8.8.8']);
const fetchBzzStruct = bzzStructureFetcher(BZZ_GATEWAY);
const fetchBzzEntry = bzzEntryFetcher(BZZ_GATEWAY);
const store = new FsStore({dir: '/tmp/swarm-proxy'});
const cache = cacheFactory(store);

const plant = new Plant();

plant.use(async ({req, res}) => {
    const bzz = await getBzzRecord(req.host);

    let files;
    const cached = await cache.get(bzz);

    if (! cached) {
        const entries = await fetchBzzStruct(bzz, {
            timeout: 10e3,
        });

        await cache.set(bzz, entries);
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

server.listen(8080, '0.0.0.0', () => {
    console.log('Server started');
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
