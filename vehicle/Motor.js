import { Worker } from 'worker_threads';
import config from '../config.js';
import { PWM } from '../main.js';
const { CtrlModel, motors } = config;
export class Motor {
    #fw = NaN;
    #bk = NaN;
    constructor([fw, bk]) {
        function pinLegal(n) {
            return (parseInt(n) === n) && n > 0 && n < 28;
        }
        if (!pinLegal(fw) || !pinLegal(bk))
            throw new TypeError(`Motor: Pin[${fw}|${bk}] is not valid`);
        PWM.postMessage({
            $setup: [fw, bk]
        });
        this.#fw = fw | 0;
        this.#bk = bk | 0;
    }
    throttle(x) {
        return [
            [this.#fw, this.#fw = x > 0 ? Math.abs(x) : 0],
            [this.#bk, this.#bk = x < 0 ? Math.abs(x) : 0],
        ]
    }
    static motors = [];
    static drive(params) {
        const MotionMatrix = new Array(this.motors.length).fill(0), throttle = {};
        // Santilize throttle axes
        for (const axes in CtrlModel)
            throttle[axes] = parseFloat(params[axes]) || 0;
        // Apply throttles to motion matrix
        MotionMatrix = MotionMatrix.map((el, i) => {
            let motion = +0.0;
            for (const axes in CtrlModel)
                motion += throttle[axes] * CtrlModel[axes];
            return motion;
        })
        const linear_throttle = Math.max(1, ...MotionMatrix.map(x => Math.abs(x)));
        // Drive actual motors using PWM
        this.exec(MotionMatrix.map(x => x / linear_throttle));
    }
    static exec(MotionMatrix) {
        if (MotionMatrix === undefined) {
            // Zero out all matrices
            MotionMatrix = new Array(this.motors.length).fill(0);
        }
        if (MotionMatrix.length !== this.motors.length)
            throw new RangeError(
                `Input has ${MotionMatrix.length
                } dimensions, while only ${this.motors.length
                } motors are registered`
            );
        else
            PWM.postMessage(
                Object.fromEntries(
                    this.motors.map((motor, i) => motor.throttle(MotionMatrix[i]))
                )
            )
    }
}
Motor.motors = motors.map(pins => new Motor(pins));
