"use strict";
let AuthModel = null;
let AuthConfig = null;
const path = require("path");
const passport = require("koa-passport");
const ORM = require("./orm").orm;
const Promise = require('bluebird');
const hash = Promise.promisify(require('bcrypt').hash);
const compare = require('bcrypt').compare;
const getuser = function(username, password, done) {
	let query = {};
	query[AuthConfig.username] = username;
	AuthModel.findOne({
		where: query
	}).then((user) => {
		if (user !== null) {
			compare(password, user[AuthConfig.password], (err, res) => {
				if (err) {
					console.error(err);
				}
				done(null, res ? user : null);
			});
		} else {
			done(null, null);
		}
	}, (err) => {
		done(err, null);
	});
};
const GetUser = Promise.promisify(getuser);
const createUser = function*(username, password, body) {
	const user = yield GetUser(username, password);
	body[AuthConfig.username] = username;
	body[AuthConfig.password] = yield hash(password, 5);
	if (user === null) {
		return yield AuthModel.create(body);
	} else {
		return {
			error: "User Already Extis"
		};
	}

};
module.exports = {
	createUser: createUser,
	getuser: getuser,
	findUser: GetUser,
	initialize(app) {
		AuthConfig = require(path.join(process.cwd(), "config", "security"));
		AuthModel = ORM[app.inflect.pluralize(AuthConfig.model)];

		const Model = ORM[app.inflect.pluralize(AuthConfig.model)];
		passport.serializeUser(function(user, done) {
			done(null, user._id);
		});
		passport.deserializeUser(function(id, done) {
			Model.findById(id).then((user) => {
				done(null, user);
			}, (err) => {
				done(err, null);
			});
		});
		Object.keys(AuthConfig.strategies).forEach((strategy) => {
			const STR = AuthConfig.strategies[strategy];
			try {
				let component = STR.package || `passport-${strategy}`;
				let Strategy = require(component)[STR.strategy||"Strategy"];
				if (STR.options) {
					passport.use(STR.identifier, new Strategy(STR.options, STR.secret));
				} else {
					passport.use(STR.identifier, new Strategy(STR.secret));
				}
			} catch (err) {
				console.log(err.stack);
				console.log(app.inflect.camelize(`${strategy}_strategy`) + " not found");
				console.log(`You might try koaton oauth2server install ${STR.package}`);
			}
			console.log();
		});
		return function*(next) {
			// this.passport = passport;
			yield next;
		};
	}
}
