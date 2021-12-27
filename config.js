import fs from "fs";
export default Object.assign({
    mDNS: {
        name: "Node Vehicle",
        type: "node-vehicle",
        port: 8999
    },
    motors: [
        [26, 19],
        [13,  6],
        [23, 24],
        [ 9, 11]
    ],
    CtrlModel: {
        x: [+1.0, +1.0, +1.0, +1.0],
        y: [+1.0, -1.0, -1.0, +1.0],
        r: [+1.0, -1.0, +1.0, -1.0]
    }
}, (() => {
    try {
        return JSON.parse(fs.readFileSync('./config.json'));
    } catch (e) {
        return {};
    }
})() || {});