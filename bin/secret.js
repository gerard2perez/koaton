'use strict';
const Promise = require('bluebird');
module.exports=Promise.promisify(require('crypto').randomBytes);