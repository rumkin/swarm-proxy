const dns = require('dns');
const {promisify} = require('util');

const re = /^bzz=/;

module.exports = function(servers = []) {
    const resolver = new dns.Resolver();
    if (servers && servers.length) {
        resolver.setServers(servers);
    }

    const resolveTxt = promisify(resolver.resolveTxt.bind(resolver));

    return async function getBzzRecord(domain) {
        const records = await resolveTxt(domain);

        const [bzz] = records.find((records) => re.test(records[0]));

        if (! bzz) {
            return null;
        }

        return bzz.slice(4);
    }
}
