// Diagnostics utility
// Write to main log file
import 'colors';
import { noColor } from './string.js';
import { parentPort, isMainThread } from "worker_threads";
export class AssertionError extends Error { };

export class UserPrivilegeError extends Error { };
/**
 * If condition is NOT true, throws an error.
 * @param {boolean} condition true for a successful assertion, false otherwise
 * @param {*} message error message if assert failed
 */
export function assert(condition = false, message = 'Assert Failed') {
	if (condition !== true) throw new AssertionError(typeof message === 'function' ? message() : message);
}
/**
 * Log proxy
 */
export const log = {
	capture: null,
	enable: true,
	info(...msgs) {
		const logEntry = formatLog('info', ...msgs);
		if (this.enable) $log(logEntry);
		// if (this.enable) console.log(logEntry);
		if (this.capture) this.capture.push(noColor(logEntry));
		return logEntry;
	},
	warn(...msgs) {
		const logEntry = formatLog('warn', ...msgs);
		if (this.enable) $log(logEntry);
		// if (this.enable) console.log(logEntry);
		if (this.capture) this.capture.push(noColor(logEntry));
		return logEntry;
	},
	error(...msgs) {
		const logEntry = formatLog('error', ...msgs);
		if (this.enable) $log(logEntry);
		// if (this.enable) console.log(logEntry);
		if (this.capture) this.capture.push(noColor(logEntry));
		return logEntry;
	},
	beginCapture() {
		this.capture = [];
	},
	dumpCapture() {
		const capture = this.capture;
		this.capture = null;
		return capture;
	}
};
function $log(msg) {
	if (!isMainThread) {
		parentPort.postMessage({
			cmd: "$log",
			data: msg
		});
	} else {
		console.log(msg);
	}
}

function formatLog(type, proto, ...msgs) {
	return [
		formatTime().dim.underline,
		[formatTitle(proto),
		formatMsg(...msgs)].join(' ').trim()[{
			info: 'dim',
			warn: 'yellow',
			error: 'red'
		}[type]]
	].join(' ');
}

const [
	TIME_ZONE_OFFSET_MS,
	TIME_ZONE_OFFSET_STR
] = (() => {
	let offset = (new Date).getTimezoneOffset();
	return [
		offset * 60_000,
		`GMT${
			['+', '', '-'][Math.sign(offset) + 1]
		}${
			offset == 0
			? ''
			: parseInt(BigInt(Math.abs(offset)) / BigInt(60))
		}`
	]
})();

function formatTime() {
	return [...(
		new Date(Date.now() - TIME_ZONE_OFFSET_MS)
	).toISOString()
		.replace(/\.\d+/g, '')
		.split(/T|Z/g)
		.filter(el => el),
		TIME_ZONE_OFFSET_STR
	].join(' ');
}

function formatTitle(proto) {
	if (typeof proto === 'string') return `${proto}`;
	if (typeof proto === 'function' || typeof proto === 'object' && proto !== null) {
		if (typeof proto.name === 'string') return `[${proto.name}]`;
		else if (typeof proto.$name === 'string') return `[${proto.$name}]`;
		else if ('constructor' in proto) return formatTitle(proto.constructor);
	}
	if (!proto) return ''
	else return `[INVALID PROTO: ${proto}]`;
}

function formatMsg(...msgs) {
	if (msgs.length == 0) return '';
	const msg = msgs.length === 1
		? msgs[0]
		: msgs;
	if (typeof msg === 'string') {
		return msg;
	} else {
		return formatMsg(JSON.stringify(msg, null, 4));
	}
}