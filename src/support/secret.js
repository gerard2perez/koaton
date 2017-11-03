import * as bcrypt from 'bcrypt';
import debug from './debug';
import * as crypto from 'crypto';
/**
 * If an error happes send it to debug function.
 */
function handle (fn) {
	return function (...args) {
		return new Promise((resolve) => {
			fn.bind(this)(...args, function (err, result) {
				/* istanbul ignore if */
				if (err) {
					debug(err);
				} else {
					resolve(result);
				}
			});
		});
	};
}

/**
 * Creates a hashed password
 * @type {function}
 * @param {string} plainPassword
 * @param {string} saltRounds
 * @return {Promise<string>} hashed password
 * @see https://github.com/kelektiv/node.bcrypt.js
 */
export let hash = handle(bcrypt.hash);

/**
 * Campares a plain text password against a hashed password
 * @type {function}
 * @param {string} plainPassword
 * @param {string} hash
 * @return {Promise<boolean>}
 * @see https://github.com/kelektiv/node.bcrypt.js
 */
export let compare = handle(bcrypt.compare);

/**
 * Generates random bytes
 * @param {int} amount - Number of bytes to generate
 * @return {Promise<string>} random bytes
 * @see https://github.com/kelektiv/node.bcrypt.js
 */
let randomBytes = handle(crypto.randomBytes);
export default randomBytes;
