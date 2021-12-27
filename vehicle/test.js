import RPI_GPIO from "rpi-gpio";
const GPIO = RPI_GPIO.promise;
RPI_GPIO.setMode(GPIO.MODE_BCM);
// List of pins
const motors = [
    [26, 19],
    [13,  6],
    [23, 24],
    [ 9, 11]
]
// Setup
for (const [f, b] of motors) {
    await GPIO.setup(f, GPIO.DIR_OUT);
    await GPIO.setup(b, GPIO.DIR_OUT);
}
// Speed Config
const [full_speed, ...speed] = process.argv.slice(2).map(el => parseInt(el));
console.log(`Running at speeds ${speed.join(' ')}`)
// Keep alive
let counter = 0 | 0;
const int = setInterval(() => {
    motors.forEach(([f, b], i) => {
        GPIO.write(f, (flip || full_speed) && speed[i] > 0);
        GPIO.write(b, (flip || full_speed) && speed[i] < 0);
    })
    counter = ++counter & 0b111111 // 64 steps per period
}, 10);
// Exit handler
process.on('SIGINT', async () => {
    clearInterval(int);
    for (const [f, b] of motors) {
        await GPIO.write(f, false);
        await GPIO.write(b, false);
    }
    process.exit(0);
})
