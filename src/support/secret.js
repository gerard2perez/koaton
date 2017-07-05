import * as bcrypt from 'bcrypt';
import debug from './debug';
import * as crypto from 'crypto';

/**
 * Creates a hashed password
 * @param {string} plainPassword
 * @param {string} saltRounds
 * @return {Promise<string>} hashed password
 * @see https://github.com/kelektiv/node.bcrypt.js
 */
export function hash (plainPassword, saltRounds) {
	return new Promise(function (resolve) {
		bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
			/* istanbul ignore if */
			if (err) {
				debug(err);
			} else {
				resolve(hash);
			}
		});
	});
}
/**
 * Campares a plain text password against a hashed password
 * @param {string} plainPassword
 * @param {string} hash
 * @return {Promise<boolean>}
 * @see https://github.com/kelektiv/node.bcrypt.js
 */
export function compare (plainPassword, hash) {
	return new Promise(function (resolve) {
		bcrypt.compare(plainPassword, hash, function (err, res) {
			/* istanbul ignore if */
			if (err) {
				debug(err);
			} else {
				resolve(res);
			}
		});
	});
}
/**
 * Generates random bytes
 * @param {int} amount - Number of bytes to generate
 * @return {Promise<string>} random bytes
 * @see https://github.com/kelektiv/node.bcrypt.js
 */
export default function randomBytes (amount) {
	return new Promise(function (resolve) {
		crypto.randomBytes(amount, function (err, res) {
			/* istanbul ignore if */
			if (err) {
				debug(err);
			} else {
				resolve(res);
			}
		});
	});
}
