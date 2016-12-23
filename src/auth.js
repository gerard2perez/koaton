import { hash } from './support/secret';
import { compare } from 'bcrypt';
import * as passport from 'koa-passport';
import { models } from './orm';
import inflector from './support/inflector';
// import * as Promise from 'bluebird';

let AuthModel;

function getuser (username, password, done) {
	let query = {};
	query[configuration.username] = username;
	AuthModel.findOne({
		where: query
	}).then((user) => {
		if (user !== null) {
			compare(password, user[configuration.password], (err, res) => {
				if (err) {
					console.error(err);
				}
				console.log(res);
				done(null, res ? user : null);
			});
		} else {
			done(null, null);
		}
	}, done).catch(done);
}
function _getuser (username, password) {
	return getuser.bind(getuser, username, password);
}
function * createUser (username, password, body) {
	const user = yield _getuser(username, password);
	body[configuration.username] = username;
	body[configuration.password] = yield hash(password, 5);
	if (user === null) {
		return yield AuthModel.create(body);
	} else {
		return {
			error: 'User Already Extis'
		};
	}
}

function initialize () {
	AuthModel = models[inflector.pluralize(configuration.model)];
	const Model = models[inflector.pluralize(configuration.model)];
	/* istanbul ignore if*/
	if (!Model) {
		return;
	}
	passport.serializeUser(function (user, done) {
		done(null, user._id);
	});
	passport.deserializeUser(function (id, done) {
		Model.findById(id).then((user) => {
			done(null, user);
		}, (err) => {
			done(err, null);
		});
	});
	Object.keys(configuration.strategies).forEach((strategy) => {
		const STR = configuration.strategies[strategy];
		try {
			let component = STR.package || /* istanbul ignore next: I have to change the proyect structure*/`passport-${strategy}`;
			let Strategy = require(ProyPath('node_modules', component))[STR.strategy || 'Strategy'];
			if (STR.options) {
				passport.use(STR.identifier, new Strategy(STR.options, STR.secret || getuser));
			} else {
				passport.use(STR.identifier, new Strategy(STR.secret || getuser));
			}
		} catch (err) /* istanbul ignore next*/ {
			console.log(err.stack);
			console.log(inflector.camelize(`${strategy}_strategy`) + ' not found');
			console.log(`You might try koaton oauth2server install ${STR.package}`);
		}
		console.log();
	});
}

export { getuser, initialize, createUser };
