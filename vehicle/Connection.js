// The VEHICLE end
import bonjour from 'bonjour';
import http from 'http';
import config from '../util/config.js';
import fs from 'fs';
import { log } from '../util/diagnostics.js';
import { ServiceWorker } from '../util/Service.js';
export const TxList = [];
// Register worker service
const Service = new ServiceWorker(
    {
        $halt() {
            return new Promise((resolve, reject) => {
                mDNS.unpublishAll(
                    () => server.close(
                        () => resolve()
                    )
                );
            })
        },
        $init() {
            log.info('Initialized');
        }
    }
)
// Create Server
const server = http.createServer(({ url }, response) => {
    log.info('IncomingRequest', url);
    if (url === '/' || url === '') {
        response.end(fs.readFileSync('./index.html'));
        return;
    } else {
        response.writeHead(200).end();
    }
    const params = Object.fromEntries(
        url
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
                    log.error('IncomingRequest', e);
                    return undefined;
                }
            })
            .filter(el => el !== undefined)
    );
    // Send data to controller
    if ('hlt' in params) {
        // Halt all motion
        Service['vehicle/Motor'].exec();
    } else {
        Service['vehicle/Motor'].drive(params);
    }
})
try {
    // server.listen(config.mDNS.port);
} catch (e) {
    log.error('Server', e.stack);
}
// Service publication
const mDNS = bonjour();
try {
    mDNS.publish({
        name: config.mDNS.name,
        type: config.mDNS.type,
        port: config.mDNS.port
    });
    mDNS.server
    // Cancel broadcast at SIG_INT
    process.on('SIGINT', () => {
        log.info('Connection', 'Closing all connections');
        mDNS.unpublishAll(() => process.exit(0));
    })
} catch (e) {
    log.error('[Bonjour]', e);
}