import { Worker } from 'worker_threads';
import { Motor } from './vehicle/Motor.js';
const Connection = new Worker('./vehicle/connection.js');
Connection.on('message', (params) => {
    if ('hlt' in params) {
        // Halt all motion
        Motor.drive();
    } else {
        Motor.drive(params);
    }
});
// Exit sequence
process.on('SIGINT', () => {
    Connection.kill('SIGINT');
    Motor.killPWM('SIGINT');
    process.exit(0);
})