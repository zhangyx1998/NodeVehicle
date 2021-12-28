import { assert } from "./diagnostics.js";

/**
 * Tells if a given path exists in given object
 * Note that a 'null' value also resolves to 'true'
 * @param {object} obj 
 * @param {...string} paths 
 */
export function dig(obj, path, ...paths) {
	if (!path) return true;
	// Type check
	if (
		(typeof obj !== 'object' && typeof obj !== 'function')
		|| obj === null
	) return false;
	// Exact match
	if (path in obj) return dig(obj[path], ...paths);
	// Wildcard search
	if (path === '*') {
		return [obj, ...Object.values(obj)].map(el => dig(el, ...paths)).reduce((a, b) => a || b);
	}
	return false;
}

/**
 * If path exists in given obj, return its value
 * Otherwise, return null
 * @param {object} obj 
 * @param {...string} paths 
 */
export function digVal(obj, path, ...paths) {
	if (!path) return obj;
	// Type check
	if (
		(typeof obj !== 'object' && typeof obj !== 'function')
		|| obj === null
	) return undefined;
	// Exact match
	if (path in obj) return digVal(obj[path], ...paths);
	// Wildcard search
	if (path === '*') {
		return [obj, ...Object.values(obj)].map(el => digVal(el, ...paths));
	}
	return undefined;
}

/**
 * 
 * @param {object} template 
 * @param {object} source 
 */
export function fill(template, source) {
	assert(
		typeof source === typeof template,
		'Type of source data should be same with template.'
	);
	if (typeof template !== 'object') {
		// Process basic value
		return source;
	} else if (Array.isArray(template)) {
		// Detect array
		assert(Array.isArray(source), 'Template element is an array, while source data is not');
		return source.map(el => el);
	} else {
		// Scan through entries
		const result = {};
		for (const entry in template) {
			if (entry in source) {
				// Math each sub-entry
				result[entry] = fill(template[entry], source[entry]);
			} else {
				// Use template
				result[entry] = template[entry];
			}
		}
		return Object.assign({}, result);
	}
}

export function setEntry(obj, path, val) {
	if (typeof path === 'string') path = [path];
	assert(Array.isArray(path) && path.length > 0);
	assert(typeof obj === 'object');
	const valName = path.pop();
	for (const name of path) {
		assert(typeof name === 'string');
		if (name in obj) {
			assert(typeof obj[name] === 'object');
		} else {
			obj[name] = {};
		}
		obj = obj[name];
	}
	obj[valName] = val;
}

export function unsetEntry(obj, path) {
	if (typeof path === 'string') path = [path];
	assert(Array.isArray(path) && path.length > 0);
	assert(typeof obj === 'object');
	const valName = path.pop();
	for (const name of path) {
		assert(typeof name === 'string');
		if (name in obj) {
			assert(typeof obj[name] === 'object');
		} else {
			obj[name] = {};
		}
		obj = obj[name];
	}
	delete obj[valName];
}

export function resemble(origin, target) {
	if (typeof origin !== typeof target) {
		// console.log(
		// 	'{resemble}',
		// 	`type mismatch. origin: ${
		// 		typeof origin
		// 	}: ${origin}, target: ${
		// 		typeof target
		// 	}: ${target}`);
		// return false;
	}
	if (typeof origin === 'object') {
		for (const entry in origin) {
			if (entry in target) {
				 if (!resemble(origin[entry], target[entry])) return false;
			} else {
				console.log(
					'@resemble',
					`entry ${entry} missing in target`
				);
				return false;
			}
		}
	}
	return true;
}
/**
 * 
 * @param {Function} proto 
 * @param  {...Function} exts 
 * @returns 
 */
export function mixin(proto, ext, ...exts) {
	if (typeof ext !== 'function') return proto;
	return mixin($mixin(proto, ext), ...exts);
}