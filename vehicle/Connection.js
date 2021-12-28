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
                log.info('[Connection]', 'Shutting down');
                mDNS.unpublishAll(
                    () => server.close(
                        () => resolve()
                    )
                );
            })
        },
        $init() {
            // console.log(Error().stack)
            // Open http server
            try {
                server.listen(config.mDNS.port);
                log.info('[Server]', `Server listening at port ${config.mDNS.port}`);
            } catch (e) {
                log.error('[a]', e.stack);
            }
            // Publish boujour service
            try {
                mDNS.publish({
                    name: config.mDNS.name,
                    type: config.mDNS.type,
                    port: config.mDNS.port
                });
                log.info('[Boujour]', `Service published as '${config.mDNS.name}'`);
            } catch (e) {
                log.error('[Bonjour]', e.stack);
            }
        }
    }
)
// Service publication
const mDNS = bonjour();
// Create Server
const server = http.createServer((request, response) => {
    const { url, method } = request;
    if (method === 'GET') {
        // Try to read as normal file
        fs.readFile(`./webUI/${url}`, (err, data) => {
            if (err) {
                fs.readFile(`./webUI/${url}/index.html`, (err, data) => {
                    if (err) {
                        response.writeHead(404).end();
                    } else {
                        response.writeHead(200).end(data);
                    }
                })
            } else {
                response.writeHead(200).end(data);
            }
        })
    } else if (method === 'POST') {
        response.writeHead(200).end();
        let body = [];
        request
            .on('data', chunk => body.push(chunk))
            .on('end', () => {
                const params = Object.fromEntries(
                    body
                        .join('')
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
            });
    }
})