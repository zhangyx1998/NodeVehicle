import { Worker } from 'worker_threads';
export const PWM = new Worker('./vehicle/pwm.js');
const Connection = new Worker('./vehicle/connection.js');
import { Motor } from './vehicle/Motor.js';
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
    PWM.kill('SIGINT');
    process.exit(0);
})