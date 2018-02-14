const Error3 = require('error3');
module.exports = function(store) {
    return new FsCache({store});
};

class FsCache {
    constructor({store}) {
        this.store = store;
    }

    async get(name) {
        if (! await this.store.has(name)) {
            return null;
        }

        const content = await this.store.get(name);

        try {
            return JSON.parse(content);
        }
        catch (err) {
            throw new Error3('entry_json', {entry: name});
        }
    }

    async set(name, value) {
        return this.store.set(name, JSON.stringify(value, null, 4));
    }

    async has(name) {
        return this.store.has(name);
    }

    async delete(name) {
        return this.store.delete(name);
    }
}
