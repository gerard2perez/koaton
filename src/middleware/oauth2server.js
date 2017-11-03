import * as Router from 'koa-router';
import * as oauth2orize from 'oauth2orize-koa';
import * as passport from 'koa-passport';
import oauth2models from './oauth2models';
import { models, addModel } from './orm';
import { createUser, getUser } from './auth';
import secret from '../support/secret';
import inflector from '../support/inflector';
import debug from '../support/debug';

/**
 * @ignore
 */
async function generateToken (token, refreshtoken, user, client) {
	let date = new Date(Date.now() + (configuration.security.tokenTimeout * 1000));
	let access = await models.oauth2accesstokens.create({
		'UserId': user._id,
		'RefreshToken': refreshtoken.toString('hex'),
		'Token': token.toString('hex'),
		'ApplicationId': client._id,
		'Expires': date,
		'Scope': 'read write'
	});
	return [access.Token, {
		refresh_token: access.RefreshToken,
		expires_in: Math.floor((access.Expires - access.created) / 1000)
	}];
}
/**
 * @ignore
 */
const BasicStrategy = require('passport-http').BasicStrategy,
	ClientStrategy = require('passport-oauth2-client-password').Strategy,
	BearerStrategy = require('passport-http-bearer').Strategy,
	server = oauth2orize.createServer();

/**
 * Indicate which model to use as Authorization Model, this can be configured in config/security.js#model
 * @type {CaminteJSModel}
 */
export let AuthModel = models[inflector.pluralize(configuration.security.model)];
/**
 * Creates a autorize-koa server and set it up ussing passport<br/>
 * Default implemented strategies are:
 * <ol><li>BasicStrategy</li>
 * <li>ClientStrategy</li>
 * <li>BearerStrategy</li></ol>
 * @return {KoaRouter} Aouth2ServerMiddleware - Default routes append are /singin /token/ /singup /singout
 */
export function oauth2server () {
	AuthModel = models[inflector.pluralize(configuration.security.model)];
	for (let model in oauth2models) {
		addModel(inflector.pluralize(model), oauth2models[model]);
	}
	const router = new Router();
	passport.use(new BasicStrategy(getUser));
	passport.use(new ClientStrategy(getUser));
	passport.use(new BearerStrategy(async function (token, done) {
		let accesstoken = await models.oauth2accesstokens.findOne({
			where: {
				Token: token
			}
		});
		if (accesstoken !== null) {
			/* istanbul ignore else */
			if (accesstoken.Expires < Date.now()) {
				return done(null, false);
			}
			let user = await AuthModel.rawAPI.findById(accesstoken.UserId);
			/* istanbul ignore if */
			if (user === null) {
				return done(null, false);
			} else {
				return done(null, user, accesstoken.Scope);
			}
		} else {
			return done(null, false);
		}
	}));
	/* istanbul ignore next */
	server.serializeClient(function (client, done) {
		return done(null, client._id);
	});
	/* istanbul ignore next */
	server.deserializeClient(function (id, done) {
		AuthModel.rawAPI.findById(id, function (err, client) {
			if (err) {
				return done(err);
			}
			return done(null, client);
		});
	});
	/* istanbul ignore next */
	server.grant(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
		debug('grant refreshToken');
	}));
	/* istanbul ignore next */
	server.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares) {
		debug(client, redirectURI, user, ares);
	}));
	server.exchange(oauth2orize.exchange.authorizationCode({
		userProperty: 'data'
	}, async function ({user, client}, token) {
		return generateToken(token, await secret(16), user, client);
	}));
	server.exchange(oauth2orize.exchange.password({
		userProperty: 'client'
	}, async function (client, username, password) {
		let user = await getUser(username, password);
		let [token, refreshtoken] = await Promise.all([secret(16), secret(16)]);
		return generateToken(token, refreshtoken, user, client);
	}));
	router.post('/singin/', passport.authenticate('local'), async function singin (ctx, next) {
		await next();
		ctx.body = {
			logged: ctx.isAuthenticated()
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
	router.post('/token/',
		passport.authenticate(['local', 'bearer', /* 'basic', */ 'oauth2-client-password'], { session: false }),
		async function token (ctx, next) {
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
			const type = grantType[ctx.request.body.grant_type];
			switch (ctx.query.response_type) {
				case 'code':
					ctx.request.body.code = (await secret(16)).toString('hex');
					break;
				case 'password':
					ctx.state.client = ctx.state.data.client;
					break;
					/* istanbul ignore next */
				default:
					ctx.response.status = 400;
					return;
			}
			if (!ctx.state.data.user || !ctx.state.data.client) {
				ctx.response.status = 406;
			} /* istanbul ignore next */ else if (type.indexOf(ctx.state.data.client.AuthorizationGrantType) === -1) {
				ctx.response.status = 500;
			} else {
				await server._exchange(exchanges[ctx.query.response_type], ctx, /* istanbul ignore next */ function (err) {
					throw err;
				});
			}
		});
	router.post('/singup/', async function singup (ctx, next) {
		const user = await createUser(ctx.request.body.username, ctx.request.body.password, ctx.request.body);
		if (user !== null && user.id && user.error === undefined) {
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
	});
	return router.middleware();
}
/**
 * @param {String} model=configuration.security.model - default model is configured at  config/security.js#model
 */
export function setAuthModel (model) {
	AuthModel = models[inflector.pluralize(configuration.security.model)];
}
