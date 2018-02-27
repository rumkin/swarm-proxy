const dns = require('dns');
const {promisify} = require('util');

const re = /^swarm=/;

module.exports = function(servers = []) {
    const resolver = new dns.Resolver();
    if (servers && servers.length) {
        resolver.setServers(servers);
    }

    const resolveTxt = promisify(resolver.resolveTxt.bind(resolver));

    return async function getBzzRecord(domain) {
        const records = await resolveTxt(domain);

        const [record] = records.find((records) => re.test(records[0]));

        if (! record) {
            return null;
        }

        const swarm = {};
        record.split(/\s+/)
        .forEach((item) => {
            const i = item.indexOf('=');
            if (i < 0) {
                swarm[item] = true;
            }
            else {
                swarm[item.slice(0, i)] = item.slice(i + 1);
            }
        });
        return swarm;
    }
}
