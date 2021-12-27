// The VEHICLE end
import bonjour from 'bonjour';
import http from 'http';
import config from '../config.js';
import { isMainThread, parentPort,  } from 'worker_threads';
export const TxList = [];
// Create Server
const server = http.createServer((request, response) => {
    console.log('Got request', request.url);
    const params = Object.fromEntries(
        request.url
            .replace(/^\//i, '')
            .split('&')
            .map(el => {
                try {
                    const {
                        name,
                        value
                    } = /^(?<name>[a-zA-Z_]+)(?<value>.*)$/g
                        .exec(el)
                        .groups;
                    return [name, value];
                } catch (e) {
                    console.log(e);
                    return undefined;
                }
            })
            .filter(el => el !== undefined)
    );
    // Send data to controller
    parentPort.postMessage(params);
    response.writeHead(200).end();
})
server.listen(config.mDNS.port);
// Service publication
const mDNS = bonjour();
mDNS.publish({
    name: config.mDNS.name,
    type: config.mDNS.type,
    port: config.mDNS.port
});
// Cancel broadcast at SIG_INT
process.on('SIGINT', () => {
    console.log();
    mDNS.unpublishAll(() => process.exit(0));
})