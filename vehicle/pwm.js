import { isMainThread, parentPort } from "worker_threads";
import RPI_GPIO from "rpi-gpio";
// Check for run env
if (isMainThread) throw new Error('pwm.js should be launched as a child process');
// GPIO Async Utilsimport RPI_GPIO from "rpi-gpio";
const GPIO = RPI_GPIO.promise;
RPI_GPIO.setMode(GPIO.MODE_BCM);
// Main PWM Object
class PWM {
    static Timer = setInterval(() => this.fire(), 1);
    static period = 0b11111 | 0;
    static counter = 0 | 0;
    static pinList = {};
    static fire() {
        Object.entries(this.pinList).forEach(([pin, width]) => {
            GPIO.write(parseInt(pin), this.counter < width);
        })
        this.counter = (this.counter + 1) & this.period;
    }
    static set(pin, ratio) {
        try {
            if (pin in this.pinList) {
                const fRatio = Math.min(1, Math.abs(parseFloat(ratio)));
                const iRatio = Math.round(this.period * fRatio) | 0;
                this.pinList[pin] = iRatio;
            }
        } catch (err) {
            console.log(`Error setting pin${pin} at ratio ${ratio}`);
            console.log(err.stack);
        }
    }
    static setup(pinNumber) {
        if (!(pinNumber in this.pinList))
            GPIO
                .setup(pinNumber)
                .then(() => {
                    this.pinList[pinNumber] = 0;
                })
                .catch(err => {
                    console.log(`[PWM] Error setting up pin${pinNumber}`);
                    console.log(err.stack);
                })
    }
    static async destroy(pinNumber = NaN) {
        if (pinNumber in this.pinList) {
            this.pinList[pinNumber] = 0;
            await GPIO
                .write(pinNumber, false)
                .then(GPIO.destroy(pinNumber))
            delete this.pinList[pinNumber];
        }
        if (pinNumber === NaN)
            clearInterval(this.Timer);
            await new Promise((resolve, reject) => {
                const errStack = [];
                for (const pin in this.pinList) {
                    this.destroy(pin)
                        .catch(err => {
                            errStack.push(err);
                        })
                        .then(() => {
                            if (Object.keys(this.pinList).length === 0) {
                                if (errStack.length)
                                    reject(errStack);
                                else
                                    resolve();
                            }
                        })
                }
            })
    }
}
// Instruction listener
parentPort.on('message', ({ $setup, $destroy, ...args }) => {
    if ($setup) $setup.forEach(pin => PWM.setup(pin));
    if ($destroy) $destroy.forEach(pin => PWM.destroy(pin));
    for (const pin in args) {
        PWM.set(pin, args[pin]);
    }
    console.log(args)
});
// Auto destroy at SIG_INT
process.on('SIGINT', async () => {
    await PWM.destroy();
    process.exit(0);
})