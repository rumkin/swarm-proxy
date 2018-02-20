const path = require('path');
const fs = require('fs');
const {promisify} = require('util');

const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);

class FsStore {
    constructor({dir = '.'}) {
        this.dir = dir;
    }

    _filepath(name) {
        return path.join(this.dir, path.resolve('/', `${name}`));
    }

    async get(name) {
        if (! await this.has(name)) {
            return null;
        }

        return await readFile(this._filepath(name), 'utf8');
    }

    async set(name, value) {
        return writeFile(this._filepath(name), value);
    }

    async has(name) {
        return exists(this._filepath(name));
    }

    async delete(name) {
        if (this.has(name)) {
            await unlink(this._filepath(name));
        }
    }
}

class MemoryStore {
    constructor({lifetime = Infinity} = {}) {
        this.lifetime = lifetime;
        this.memo = new Map();
    }

    async has(name) {
        if (! this.memo.has(name)) {
            return false;
        }
        else if (this.memo.get(name).expires <= Date.now()) {
            await this.delete(name);
            return false;
        }

        return true;
    }

    async get(name) {
        if (! await this.has(name)) {
            return null;
        }

        return this.memo.get(name).value;
    }

    async set(name, value) {
        this.memo.set(name, {
            value,
            expires: Date.now() + this.lifetime,
        });
    }

    async delete(name) {
        return this.memo.delete(name);
    }
}

exports.Fs = FsStore;
exports.Memory = MemoryStore;
