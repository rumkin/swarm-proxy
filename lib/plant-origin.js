const ALLOW_ORIGIN = 'access-control-allow-origin';
const ALLOW_METHODS = 'access-control-allow-methods';
const ALLOW_HEADERS = 'access-control-allow-headers';
const ALLOW_CREDENTIALS = 'access-control-allow-credentials';

module.exports = function({hosts = null} = {}) {
    return async function({req, res}, next) {
        const [hostname] = req.headers.get('host').split(':');

        if (req.headers.has('origin')) {
            if (! hosts || hostname in hosts) {
                res.headers.set(ALLOW_ORIGIN, req.headers.get('origin'));
                res.headers.set(ALLOW_METHODS, 'DELETE,POST,PUT,GET');
                res.headers.set(ALLOW_HEADERS, 'content-type,authorization');
                res.headers.set(ALLOW_CREDENTIALS, 'true');

                if (req.method === 'options') {
                    res.status(204);
                    res.end();
                    return;
                }
            }
        }

        await next();
    };
};
