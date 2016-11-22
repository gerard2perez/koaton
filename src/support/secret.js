import * as Promise from 'bluebird';

export default Promise.promisify(require('crypto').randomBytes);
