import { hash } from './support/secret';
import { compare } from 'bcrypt';
import * as passport from 'koa-passport';
import { models } from './orm';
import inflector from './support/inflector';
import * as Promise from 'bluebird';
import * as debug from './support/debug';

let AuthModel;

function getuser (username, password, done) {
	let query = {};
	query[configuration.security.username] = username;
	AuthModel.findOne({
		where: query
	}).then((user) => {
		if (user !== null) {
			compare(password, user[configuration.security.password], (err, res) => {
				/* istanbul ignore if */
				if (err) {
					console.error(err);
				}
				done(null, res ? user : null);
			});
		} else {
			done(null, null);
		}
	}, done).catch(done);
}
function _getuser (username, password) {
	return new Promise(function (resolve) {
		function done (_, data) {
			resolve(data);
		}
		getuser(username, password, done);
	});
}
const findUser = Promise.promisify(getuser);
async function createUser (username, password, body) {
	const user = await _getuser(username, password);
	body[configuration.security.username] = username;
	body[configuration.security.password] = await hash(password, 5);
	if (user === null) {
		return await AuthModel.create(body);
	} else {
		return {
			error: 'User Already Extis'
		};
	}
}

function initialize () {
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
			let Strategy = require(ProyPath('node_modules', component))[STR.strategy || 'Strategy'];
			/* istanbul ignore else */
			if (STR.options) {
				passport.use(STR.identifier, new Strategy(STR.options, STR.secret || getuser));
			} else {
				passport.use(STR.identifier, new Strategy(STR.secret || getuser));
			}
		} catch (err) /* istanbul ignore next*/ {
			debug(err);
			debug(inflector.camelize(`${strategy}_strategy`) + ' not found');
			debug(`You might try npm install ${STR.package}`);
		}
	}
}

export { getuser, initialize, createUser, findUser };
