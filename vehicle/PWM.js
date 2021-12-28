import { ServiceWorker } from '../util/Service.js';
import RPI_GPIO from "rpi-gpio";
import { log } from "../util/diagnostics.js";
// Check for run env
const Service = new ServiceWorker(
    {
        setup(args) {
            args.forEach(pin => PWM.setup(pin));
        },
        destory(args) {
            args.forEach(pin => PWM.destory(pin));
        },
        update(args) {
            for (const pin in args) {
                PWM.set(pin, args[pin]);
            }
        },
        async $halt() {
            log.info('[PWM]', 'Shutting down');
            await PWM.destroy();
        },
        $init() {
            log.info('Initialized');
        }
    }
)
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
            log.error('set()', `Error setting pin${pin} at ratio ${ratio}\n${err.stack}`);
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
                    log.error('set()', `Error setting up pin${pinNumber}\n${err.stack}`);
                })
    }
    static async destroy(pinNumber = NaN) {
        if (pinNumber in this.pinList) {
            this.pinList[pinNumber] = 0;
            await GPIO.write(pinNumber, false)
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