'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.createUser = createUser;
exports.getuser = getuser;
exports.initialize = initialize;

const hash = require('bcrypt').hash;

const compare = require('bcrypt').compare;

const passport = require('koa-passport');

const orm = require('./orm').orm;

let AuthModel;
let AuthConfig;

function* createUser(username, password, body) {
	const user = yield this.getuser(username, password);
	body[AuthConfig.username] = username;
	body[AuthConfig.password] = yield hash(password, 5);
	if (user === null) {
		return yield AuthModel.create(body);
	} else {
		return {
			error: "User Already Extis"
		};
	}
}
function getuser(username, password, done) {
	let query = {};
	query[AuthConfig.username] = username;
	AuthModel.findOne({
		where: query
	}).then(user => {
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
	}, err => {
		done(err, null);
	});
}
function initialize(app) {
	AuthConfig = require(ProyPath("config", "security"));
	AuthModel = orm[app.inflector.pluralize(AuthConfig.model)];
	const Model = orm[app.inflector.pluralize(AuthConfig.model)];
	passport.serializeUser(function (user, done) {
		done(null, user._id);
	});
	passport.deserializeUser(function (id, done) {
		Model.findById(id).then(user => {
			done(null, user);
		}, err => {
			done(err, null);
		});
	});
	Object.keys(AuthConfig.strategies).forEach(strategy => {
		const STR = AuthConfig.strategies[strategy];
		try {
			let component = STR.package || `passport-${ strategy }`;
			let Strategy = require(ProyPath('node_modules', component))[STR.strategy || "Strategy"];
			if (STR.options) {
				passport.use(STR.identifier, new Strategy(STR.options, STR.secret));
			} else {
				passport.use(STR.identifier, new Strategy(STR.secret));
			}
		} catch (err) {
			console.log(err.stack);
			console.log(app.inflector.camelize(`${ strategy }_strategy`) + " not found");
			console.log(`You might try koaton oauth2server install ${ STR.package }`);
		}
		console.log();
	});
}