const plan = require('flightplan');

plan.target('prod', {
    host: '46.101.94.15',
    username: 'root',
});

plan.local('upload', (local) => {
    const files = local.git('ls-files');

    local.transfer(files, '/tmp/app');
});

plan.remoe('upload', (remote) => {
    remote.exec('ls /tmp/app');
});
