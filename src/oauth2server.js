import * as Router from 'koa-router';
import * as oauth2orize from 'oauth2orize-koa';
import * as passport from 'koa-passport';
import oauth2models from './oauth2models';
import { models, addModel } from './orm';

import { createUser, getuser, findUser } from './auth';
import secret from './support/secret';
import inflector from './support/inflector';

const AuthConfig = require(ProyPath('config', 'security'));
const server = oauth2orize.createServer();

const BasicStrategy = require('passport-http').BasicStrategy,
	ClientStrategy = require('passport-oauth2-client-password').Strategy,
	BearerStrategy = require('passport-http-bearer').Strategy;
let AuthModel = null;

const oauth2server = function oauth2server () {
	for (let model in oauth2models) {
		addModel(inflector.pluralize(model), oauth2models[model]);
	}
	const router = new Router();
	passport.use(new BasicStrategy(getuser));
	passport.use(new ClientStrategy(getuser));
	passport.use(new BearerStrategy(
		function (token, done) {
			models.oauth2accesstokens.rawAPI.findOne({
				where: {
					Token: token
				}
			}, (err, accesstoken) => {
				if (accesstoken !== null) {
					console.log(accesstoken.Expires < Date.now());
					if (accesstoken.Expires < Date.now()) {
						return done(null, false);
					}
					AuthModel.rawAPI.findById(accesstoken.UserId, (err, user) => {
						if (err) {
							return done(err);
						} else if (user === null) {
							console.log("=============");
							return done(null, false);
						} else {
							return done(null, user, accesstoken.Scope);
						}
					});
				} else {
					return done(err, false);
				}
			});
		}
	));
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
	/* istanbul ignore next*/
	server.grant(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
		console.log('grant refreshToken');
	}));
	/* istanbul ignore next*/
	server.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares) {
		console.log(client, redirectURI, user, ares);
	}));
	server.exchange(oauth2orize.exchange.authorizationCode({
		userProperty: 'data'
	}, function (data, accesstoken) {
		if (data.client !== null && data.user !== null) {
			return secret(16).then((refreshtoken) => {
				let date = new Date(Date.now() + (1 * configuration.tokenTimeout * 1000));
				return models.oauth2accesstokens.create({
					'UserId': data.user._id,
					'RefreshToken': refreshtoken.toString('hex'),
					'Token': accesstoken.toString('hex'),
					'ApplicationId': data.client._id,
					'Expires': date,
					'Scope': 'read write'
				}).then((access) => {
					const response = [
						access.Token, {
							// refresh_token: access.RefreshToken,
							expires_in: Math.floor((access.Expires - access.created) / 1000)
						}
					];
					return response;
				});
			});
		} else {
			return null;
		}
	}));
	server.exchange(oauth2orize.exchange.password(function (client, username, password) {
		return findUser(username, password).then((user) => {
			if (client !== null && user !== null) {
				return secret(16).then((token) => {
					return secret(16).then((refreshtoken) => {
						let date = new Date(Date.now() + (1 * 60 * 1000));
						return models.oauth2accesstokens.create({
							'UserId': user._id,
							'RefreshToken': refreshtoken.toString('hex'),
							'Token': token.toString('hex'),
							'ApplicationId': client._id,
							'Expires': date,
							'Scope': 'read write'
						}).then((access) => {
							const response = [
								access.Token, {
									refresh_token: access.RefreshToken,
									expires_in: Math.floor((access.Expires - access.created) / 1000)
										// expires_at:access.Expires

									// scope:access.Scope
								}
							];
							return response;
						});
					});
				});
			} else {
				return null;
			}
		}, (err) => {
			if (err) {
				console.error(err);
			}
			return null;
		});
	}));
	router.post('/singin/', passport.authenticate('local'), async function singin (ctx, next) {
		await next();
		ctx.body = {
			logged: ctx.isAuthenticated(),
			cookie: ['koa:sess.sig', 'koa:sess']
		};
	});
	const exchanges = {
		'password': 'password',
		'refresh_token': 'refreshToken',
		'code': 'authorization_code'
	};
	const grantType = {
		'password': [2],
		'refresh_token': [3, 2]
	};
	router.post('/token/', passport.authenticate(['local', 'bearer', 'basic', 'oauth2-client-password'], {
		session: false
	}), async function token (ctx, next) {
		await next();
		ctx.state = {
			data: {
				client: await models.oauth2applications.findOne({
					where: {
						ClientId: ctx.query.client_id
					}
				}),
				user: ctx.req.user
			}
		};
		ctx.request.body = ctx.request.body;
		const type = grantType[ctx.request.body.grant_type];
		switch (ctx.request.query.response_type) {
			case 'code':
				ctx.request.body.code = (await secret(16)).toString('hex');
				break;
			default:
				ctx.response.status = 400;
				return;
		}
		if (!ctx.state.data.user || !ctx.state.data.client) {
			ctx.response.status = 406;
		} else if (type.indexOf(ctx.state.data.client.AuthorizationGrantType) === -1) {
			ctx.response.status = 500;
		} else {
			await server._exchange(exchanges[ctx.request.query.response_type], ctx, function (err) {
				throw err;
			});
		}
	});
	router.post('/singup/', async function singup (ctx, next) {
		const user = await createUser(ctx.request.body.username, ctx.request.body.password, ctx.request.body);
		if (user !== null && user.error === undefined) {
			ctx.response.status = 201;
		} else {
			ctx.response.status = 500;
			ctx.body = user;
		}
		await next();
	});
	router.post('/singout', async function singout (ctx, next) {
		ctx.logout();
		await next();
		ctx.status = 200;
		// ctx.redirect('/');
	});
	return router.middleware();
};
oauth2server.setAuthModel = function (model) {
	AuthModel = models[inflector.pluralize(AuthConfig.model)];
};

export default oauth2server;
