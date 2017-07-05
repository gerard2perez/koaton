import { hash, compare } from '../support/secret';
import * as passport from 'koa-passport';
import { models } from './orm';
import inflector from '../support/inflector';
import * as debug from '../support/debug';

let AuthModel;
/**
 * @private
 * Find a User by username, password using a callback
 * @param {String} username - Data that represents the username field in the target model.
 * @param {String} passowrd - Unencrypted data that represents the username field in the target model.
 * @param {function(err: Error, user: AuthModel)} done - function that is executed when are user or error is found.
 */
function getuser (username, password, done) {
	let query = {};
	query[configuration.security.username] = username;
	AuthModel.findOne({
		where: query
	}).then((user) => {
		if (user !== null) {
			compare(password, user[configuration.security.password]).then(res => {
				done(null, res ? user : null);
			});
		} else {
			done(null, null);
		}
	}, done).catch(done);
}
/**
 * This version return a {Promise} so it can be used with await
 * @param {String} username - Data that represents the username field in the target model.
 * @param {String} passowrd - Unencrypted data that represents the username field in the target model.
 * @param {Function} [callback] - Skip this value to return a Promise
 * @return {Promise<AuthModel>|undefined} - if callback is not set it will return a promise
 */
function getUser (username, password, callback = null) {
	if (callback == null) {
		return new Promise(function (resolve) {
			function done (_, data) {
				resolve(data);
			}
			getuser(username, password, done);
		});
	} else {
		getuser(username, password, callback);
	}
}
/**
 * Creates and user if it does not exits in the database.
 * @param {String} username - Data that represents the username field in the target model.
 * @param {String} passowrd - Unencrypted data that represents the username field in the target model.
 * @param {Object} [body={}] - Information that might be passed to the model creation.
 * @return {Promise<AuthModel>} - if callback is not set it will return a promise
 */
async function createUser (username, password, body = {}) {
	const user = await getUser(username, password);
	body[configuration.security.username] = username;
	body[configuration.security.password] = await hash(password, 5);
	if (user === null) {
		return await AuthModel.create(body);
	} else {
		return Promise.resolve({
			error: 'User Already Extis'
		});
	}
}
/**
 * Reads the configuration from config/security.js and register all the passport strategies
 */
function loadSecurityContext () {
	AuthModel = models[inflector.pluralize(configuration.security.model)];
	const Model = models[inflector.pluralize(configuration.security.model)];
	/* istanbul ignore if*/
	if (!Model) {
		return;
	}
	passport.serializeUser(function (user, done) {
		done(null, user._id);
	});
	passport.deserializeUser(function (id, done) {
		Model.findById(id).then(done.bind(null, null), done);
	});
	for (const strategy of Object.keys(configuration.security.strategies)) {
		const STR = configuration.security.strategies[strategy];
		try {
			let component = STR.package || /* istanbul ignore next: I have to change the proyect structure*/`passport-${strategy}`;
			let Strategy = require(ProyPath('node_modules', component));
			let args = [];
			/* istanbul ignore else */
			if (STR.strategy) {
				Strategy = Strategy[STR.strategy];
			}
			/* istanbul ignore else */
			if (STR.identifier) {
				args.push(STR.identifier);
			}
			/* istanbul ignore else */
			if (STR.options) {
				args.push(new Strategy(STR.options, STR.secret || getuser));
			} else {
				args.push(new Strategy(STR.secret || getuser));
			}
			passport.use(...args);
		} catch (err) /* istanbul ignore next*/ {
			debug(err);
			debug(inflector.camelize(`${strategy}_strategy`) + ' not found');
			debug(`You might try npm install ${STR.package}`);
		}
	}
}

export { getUser, loadSecurityContext, createUser };
