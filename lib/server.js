"use strict";
const passport = require('koa-passport');
const path = require('upath');
const ORM = require('./orm').orm;
const AuthConfig = require(path.join(process.cwd(), "config", "security"));
const oauth2orize = require('oauth2orize-koa');
const server = oauth2orize.createServer();
const secret = require('../bin/secret');
const AddModel = require('./orm').addModel;
const createUser = require('./auth').createUser;
const getuser = require('./auth').getuser;
const findUser = require('./auth').findUser;
const models = require('./server_models');

const BasicStrategy = require('passport-http').BasicStrategy,
	// DigestStrategy = require('passport-http').DigestStrategy,
	ClientStrategy = require('passport-oauth2-client-password').Strategy;
let Router = require(process.cwd() + '/node_modules/koa-router');
let AuthModel = null;

module.exports = function(app) {
	for (let model in models) {
		AddModel(app.inflect.pluralize(model), models[model]);
	}
	const router = new Router();
	AuthModel = ORM[app.inflect.pluralize(AuthConfig.model)];
	// passport.use(new DigestStrategy(getUser));
	passport.use(new BasicStrategy(getuser));
	passport.use(new ClientStrategy(getuser));
	server.serializeClient(function(client, done) {
		console.log("serializeClient");
		return done(null, client._id);
	});
	server.deserializeClient(function(id, done) {
		console.log("deserializeClient");
		AuthModel.rawAPI.findById(id, function(err, client) {
			if (err) {
				return done(err);
			}
			return done(null, client);
		});
	});
	server.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares) {
		console.log("grant code");
	}));
	server.exchange(oauth2orize.exchange.code(function(client, code, redirectURI) {
		console.log("exchange code");
	}));
	server.exchange(oauth2orize.exchange.password(function(client, username, password) {
		return findUser(username,password).then((user)=>{
			if (client !== null && user !== null) {
				return secret(16).then((token) => {
					let date = new Date(Date.now()+(1*60*1000));
					return ORM.oauth2accesstokens.create({
						"UserId": user._id,
						"Token": token.toString('hex'),
						"ApplicationId": client._id,
						"Expires": date,
						"Scope": "read write"
					}).then((access) => {
						const response = [
							access.Token, {
								expires_in: Math.floor( (access.Expires - access.Created) / 1000 )
									// scope:access.Scope
							}
						];
						return response;
					});
				});
			} else {
				return null;
			}
		},(err)=>{
			if(err){
				console.error(err);
			}
			return null;
		});
	}));
	router.post('/singin/',passport.authenticate('local'),function*(next){
		yield next;
		this.body = {
			logged:this.isAuthenticated(),
			cookie:["koa:sess.sig","koa:sess"]
		};
	});
	router.post('/token/', passport.authenticate(['local','basic','oauth2-client-password'], {
			session: false
		}),
		function*() {
			this.state.user = yield ORM.oauth2applications.findOne({
				where: {
					ClientId: this.query.client_id
				}
			});
			const type = this.request.body.grant_type;
			if (this.state.user === null || type !== this.state.user.AuthorizationGrantType) {
				this.response.status = 406;
			} else {
				yield server._exchange(type, this, function(err) {
					throw err;
				});
			}
		},
		server.errorHandler());
	router.post('/singup/', function*() {
		const user = yield createUser(this.request.body.username, this.request.body.password, this.request.body);
		if (user !== null && user.error === undefined) {
			this.response.status = 201;
		} else {
			this.response.status = 500;
			this.body = user;
		}
	});
	router.post('/singout',function*(next){
		this.logout();
 		this.redirect('/');
		yield next;
	});
	return router.middleware();
};
