import { Worker } from 'worker_threads';
import { Motor } from './vehicle/Motor.js';
const Connection = new Worker('./vehicle/connection.js');
Connection.on('message', (params) => {
    if ('hlt' in params) {
        // Halt all motion
        Motor.exec();
    } else {
        Motor.drive(params);
    }
});

import { Service } from './util/Service.js';
Service.init(
    'vehicle/Connection',
    'vehicle/Motor',
    'vehicle/PWM'
);