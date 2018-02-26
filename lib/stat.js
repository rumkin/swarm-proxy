const fs = require('fs');


function createStat(statfile, delay = 10e3) {
    let timer;
    let stat = {};

    if (fs.existsSync(statfile)) {
        const content = fs.readFileSync(statfile, 'utf8');
        if (content) {
            try {
                stat = JSON.parse(content);
            }
            catch (err) {
                console.error(`Stat file "${statfile}" contains no valid JSON`);
            }
        }
    }

    return {
        _schedule() {
            if (timer) {
                return;
            }

            timer = setTimeout(() => {
                timer = null;
                try {
                    fs.writeFileSync(statfile, JSON.stringify(stat));
                }
                catch (err) {
                    console.error('Write stat file failed:', err);
                }
            }, delay);
        },

        get(metric) {
            return stat[metric] || 0;
        },

        add(metric, value) {
            stat[metric] = (stat[metric] || 0) + value;

            this._schedule();
        },
    };
}

module.exports = createStat;
