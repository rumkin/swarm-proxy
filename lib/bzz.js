const Error3 = require('error3');
const axios = require('axios');
const {URL} = require('url');
const Promise = require('bluebird');

exports.bzzStructureFetcher = function(gatewayUrl) {
    return async function(hash, {timeout = 10e3, concurrency = 10} = {}) {
        const bzzUrl = new URL(gatewayUrl);
        bzzUrl.pathname = `/bzz-list:/${hash}`;

        const list = async (dir = '/') => {
            const res = await axios.get(bzzUrl.toString() + dir, {
                headers: {
                    'accept-type': 'application/json',
                },
                timeout,
            });

            if (res.status !== 200) {
                throw new Error3('bzz_http_status', {
                    status: res.status,
                });
            }
            else if (res.headers['content-type'] !== 'application/json') {
                throw new Error3('bzz_http_content_type', {
                    contentType: res.headers['content-type'],
                });
            }
            else if (typeof res.data !== 'object') {
                throw new Error3('bzz_http_type', {
                    type: typeof res.data,
                });
            }

            return res.data;
        }

        const loadStructure = async ({dirs, files}, {concurrency} = {}) => {
            let head = dirs.slice(0, 10);
            let tail = dirs.slice(10);
            let newDirs = [];
            let newFiles = [];

            await Promise.map(head, async (dir) => {
                const {common_prefixes, entries} = await list(dir);

                if (common_prefixes) {
                    newDirs = common_prefixes.map(
                        (subdir) => dir + subdir
                    );
                }

                if (entries) {
                    newFiles = entries.map((entry) => ({
                        ...entry,
                    }));
                }

            }, {concurrency});

            return {
                dirs: [...tail, ...newDirs],
                files: [...files, ...newFiles],
            };
        };

        let memory = {
            dirs: ['/'],
            files: [],
        };

        do {
            memory = await loadStructure(memory, {concurrency});
        }
        while (memory.dirs.length)

        return memory.files;
    }
};

exports.bzzEntryFetcher = function(gatewayUrl) {
    return async function(bzzHash, {timeout = 10e3} = {}) {
        const url = new URL(`/bzz-raw:/${bzzHash}`, gatewayUrl);

        const res = await axios.get(url.toString(), {
            timeout,
        });

        if (res.status !== 200) {
            throw new Error(`Invalid response code: ${res.status}`);
        }

        // TODO compare hashes !!!

        return res.data;
    };
};
