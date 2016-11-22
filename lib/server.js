'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

const oauth2orize = require('oauth2orize-koa');

const passport = require('koa-passport');

const models = require('./server_models').default;

const orm = require('./orm').orm;

const addModel = require('./orm').addModel;

const createUser = require('./auth').createUser;

const getuser = require('./auth').getuser;

const findUser = require('./auth').findUser;

const secret = require('./support/secret').default;

const AuthConfig = require(ProyPath("config", "security"));
const server = oauth2orize.createServer();

const BasicStrategy = require('passport-http').BasicStrategy,

// DigestStrategy = require('passport-http').DigestStrategy,
ClientStrategy = require('passport-oauth2-client-password').Strategy,
      BearerStrategy = require('passport-http-bearer').Strategy;
//headerStrategy = require('passport-http-header-strategy').Strategy;
let Router = require(ProyPath('node_modules', 'koa-router'));
let AuthModel = null;

const oauth2server = function oauth2server(app) {
	for (let model in models) {
		addModel(app.inflector.pluralize(model), models[model]);
	}
	const router = new Router();
	AuthModel = orm[app.inflector.pluralize(AuthConfig.model)];
	// passport.use(new DigestStrategy(getUser));
	passport.use(new BasicStrategy(getuser));
	passport.use(new ClientStrategy(getuser));
	/*passport.use(new headerStrategy({
 	header: 'Authorization',
 	passReqToCallback: true
 }, function(req, token, done) {
 	orm.oauth2accesstokens.rawAPI.findOne({
 		where: {
 			Token: token
 		}
 	}, (err, accesstoken) => {
 		if (accesstoken !== null) {
 			AuthModel.rawAPI.findById(accestoken.UserId, (err, user) => {
 				if (err) {
 					return done(err);
 				} else if (user === null) {
 					return done(null, false);
 				} else {
 					return done(null, user, accestoken.Scope);
 				}
 			});
 		} else {
 			return done(err, false);
 		}
 	});
 }));*/
	passport.use(new BearerStrategy(function (token, done) {
		orm.oauth2accesstokens.rawAPI.findOne({
			where: {
				Token: token
			}
		}, (err, accesstoken) => {
			if (accesstoken !== null) {
				if (accesstoken.Expires < Date.now()) {
					return done(null, false);
				}
				AuthModel.rawAPI.findById(accesstoken.UserId, (err, user) => {
					if (err) {
						return done(err);
					} else if (user === null) {
						return done(null, false);
					} else {
						return done(null, user, accesstoken.Scope);
					}
				});
			} else {
				return done(err, false);
			}
			return done(new Error('No token foound'), false);
		});
	}));
	server.serializeClient(function (client, done) {
		return done(null, client._id);
	});
	server.deserializeClient(function (id, done) {
		AuthModel.rawAPI.findById(id, function (err, client) {
			if (err) {
				return done(err);
			}
			return done(null, client);
		});
	});
	server.grant(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
		console.log("grant refreshToken");
	}));
	server.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares) {
		console.log(client, redirectURI, user, ares);
	}));
	server.exchange(oauth2orize.exchange.authorizationCode({
		userProperty: 'data'
	}, function (data, accesstoken) {
		if (data.client !== null && data.user !== null) {
			return secret(16).then(refreshtoken => {
				let date = new Date(Date.now() + 1 * scfg.token_timeout * 1000);
				return orm.oauth2accesstokens.create({
					"UserId": data.user._id,
					"RefreshToken": refreshtoken.toString('hex'),
					"Token": accesstoken.toString('hex'),
					"ApplicationId": data.client._id,
					"Expires": date,
					"Scope": "read write"
				}).then(access => {
					const response = [access.Token, {
						// refresh_token: access.RefreshToken,
						expires_in: Math.floor((access.Expires - access.created) / 1000)
					}];
					return response;
				});
			});
		} else {
			return null;
		}
	}));
	server.exchange(oauth2orize.exchange.password(function (client, username, password) {
		return findUser(username, password).then(user => {
			if (client !== null && user !== null) {
				return secret(16).then(token => {
					return secret(16).then(refreshtoken => {
						let date = new Date(Date.now() + 1 * 60 * 1000);
						return orm.oauth2accesstokens.create({
							"UserId": user._id,
							"RefreshToken": refreshtoken.toString('hex'),
							"Token": token.toString('hex'),
							"ApplicationId": client._id,
							"Expires": date,
							"Scope": "read write"
						}).then(access => {
							const response = [access.Token, {
								refresh_token: access.RefreshToken,
								expires_in: Math.floor((access.Expires - access.created) / 1000)
								// expires_at:access.Expires

								// scope:access.Scope
							}];
							return response;
						});
					});
				});
			} else {
				return null;
			}
		}, err => {
			if (err) {
				console.error(err);
			}
			return null;
		});
	}));
	router.post('/singin/', passport.authenticate('local'), function* singin(next) {
		yield next;
		this.body = {
			logged: this.isAuthenticated(),
			cookie: ["koa:sess.sig", "koa:sess"]
		};
	});
	const exchanges = {
		'password': 'password',
		'refresh_token': 'refreshToken',
		'code': 'authorization_code'
	};
	const grant_type = {
		"password": ['2'],
		'refresh_token': ['3', '2']
	};
	router.post('/token/', passport.authenticate(['local', 'bearer', 'basic', 'oauth2-client-password'], {
		session: false
	}), function* token(next) {
		this.state = {
			data: {
				client: yield orm.oauth2applications.findOne({
					where: {
						ClientId: this.query.client_id
					}
				}),
				user: this.req.user
			}
		};
		this.request.body = this.request.body;
		const type = grant_type[this.request.body.grant_type];
		switch (this.request.query.response_type) {
			case 'code':
				this.request.body.code = (yield secret(16)).toString('hex');
				break;
			default:
				this.response.status = 400;
				break;
		}
		// console.log(type, this.state.user.AuthorizationGrantType,exchanges[ctx.request.body.grant_type]);
		if (this.request.user === null || type.indexOf(this.state.data.client.AuthorizationGrantType) === -1) {
			this.response.status = 406;
		} else {
			yield server._exchange(exchanges[this.request.query.response_type], this, function (err) {
				throw err;
			});
		}
		yield next;
	}, server.errorHandler());
	router.post('/singup/', function* singup(next) {
		const user = yield createUser(this.request.body.username, this.request.body.password, this.request.body);
		if (user !== null && user.error === undefined) {
			this.response.status = 201;
		} else {
			this.response.status = 500;
			this.body = user;
		}
		yield next;
	});
	router.post('/singout', function* singout(next) {
		this.logout();
		this.redirect('/');
		yield next;
	});
	return router.middleware();
};
exports.default = oauth2server;