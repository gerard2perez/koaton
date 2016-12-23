import * as Promise from 'bluebird';
import { hash, compare } from 'bcrypt';

const _hash = Promise.promisify(hash),
	_compare = Promise.promisify(compare);

export { _hash as hash, _compare as compare };
export default Promise.promisify(require('crypto').randomBytes);
