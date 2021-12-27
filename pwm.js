import {isMainThread, parentPort} from "worker_threads";
import GPIO from 'rpi-gpio';
// Check for run env
if (isMainThread) throw new Error('pwm.js should be launched as a child process');
// GPIO Async Utils
async function GPIO_init(pins) {

}
async function GPIO_write() {

}
async function GPIO_whatever() {

}
// Main PWM Object
class PWM {
    constructor({
        period = 1024 | 0,
        
    })
}
// Instruction listener
parentPort.on('message', (...args) => console.log(args));