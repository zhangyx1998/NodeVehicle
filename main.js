import { Service } from './util/Service.js';
Service.init(
    'vehicle/Connection',
    'vehicle/Motor',
    'vehicle/PWM'
);
// EXIT Procedure
let PendingExit;
process.on('SIGINT', () => {
    process.stdout.write('\n');
    if (PendingExit) process.exit(0);
    PendingExit = true;
    halt()
        .then(() => process.exit(0))
        .catch(e => {
            console.error(e);
            process.exit(1);
        })
})
function halt() {
    return new Promise((resolve, reject) => {
        const errors = [];
        let pendingList = Object.keys(Service);
        for (const serviceName in Service) {
            Service[serviceName].$('$halt')
                .catch(e => errors.push(e))
                .then(() => {
                    pendingList = pendingList.filter(str => str !== serviceName);
                    if (pendingList.length == 0) {
                        if (errors.length == 0)
                            resolve();
                        else
                            reject(errors);
                    }
                })
        }
        if (pendingList.length == 0) resolve();
    })
}