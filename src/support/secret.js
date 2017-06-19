import * as bcrypt from 'bcrypt';
import debug from './debug';
import * as crypto from 'crypto';

export function hash (plainPassword, saltRounds) {
	return new Promise(function (resolve) {
		bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
			if (err) {
				debug(err);
			}
			resolve(hash);
		});
	});
}

export function compare (plainPassword, hash) {
	return new Promise(function (resolve) {
		bcrypt.compare(plainPassword, hash, function (err, res) {
			if (err) {
				debug(err);
			}
			resolve(res);
		});
	});
}

export default function randomBytes (amount) {
	return new Promise(function (resolve) {
		crypto.randomBytes(amount, function (err, res) {
			if (err) {
				debug(err);
			}
			resolve(res);
		});
	});
}
