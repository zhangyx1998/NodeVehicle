import crypto from 'crypto';
import { assert } from './diagnostics.js';
import { digVal } from './object.js';
/**
 * Returns hashed string by given method.
 * @param {string} content The string to be hashed
 * @param {string} method Method of hash algorithm
 * @param {string} format Format of final result
 * @returns {string} Hashed content
 */
export function hash(content, method = 'sha256', format = 'hex') {
	return crypto.createHash(method).update(content).digest(format);
}
/**
 * Returns a pair of salted password string and its salt.
 * @param {string} password
 * @param {string} salt
 * @returns {object} keyPair 
 */
export function keyPair(password, salt = seed()) {
	return {
		hash: hash(mix(password, salt), 'sha256', 'hex'),
		salt: salt
	}
}
/**
 * Tests if a given key matches the key pair.
 * @param {object} keyPair 
 * @param {string} key 
 * @returns 
 */
export function testKey(keyPair, key) {
	if (typeof keyPair !== 'object' || keyPair === null) return false;
	assert(!!(digVal(keyPair, 'hash') && digVal(keyPair, 'salt')), 'Illegal Keypair');
	return hash(mix(key, keyPair.salt), 'sha256', 'hex') === keyPair.hash;
}
/**
 * Returns a pair of salted password string and its salt.
 * @param {string} password
 * @param {string} salt
 * @returns {object} keyPair 
 */
export function mix(password, salt) {
	assert(typeof password === 'string' && typeof salt === 'string');
	salt = salt.split('').reverse();
	return password.split('').map(c => c + (salt.length > 0 ? salt.pop() : '')).join('');
}
/**
 * Generates random salt seed string.
 */
export function seed(length = 8) {
	return Math
		.random()
		.toString(36)
		.toUpperCase()
		.replace(/0*\./g, '')
		.padStart(11, '0')
		.slice(-length);
}

/**
 * Finds a unique seed that is not existent in given list.
 */
export function uniqSeed(exist = () => true, length = 8) {
	let result, exists;
	while (exists = exist(result = seed(length))) {
		if (exists instanceof Promise) {
			return exists.then(async res => res ? await uniqSeed(exist, length) : result);
		}
	}
	return result;
}