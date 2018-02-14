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
        return unlink(this._filepath(name));
    }
}

module.exports = FsStore;
