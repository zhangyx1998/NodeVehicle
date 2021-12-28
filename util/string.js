import { assert } from "./diagnostics.js";
/**
 * Remove all shell escape characters in a given string
 * @param {String} str 
 * @returns {String}
 */
export const noColor = str => assert(typeof str == 'string') && str.replace(/\033\[[0-9;]+m/g, '');