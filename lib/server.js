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

const models = {
	oauth2accesstoken: function(schema) {
		return {
			"model": {
				"UserId": {
					type: schema.String
				},
				"Token": {
					type: schema.String
				},
				"ApplicationId": {
					type: schema.String
				},
				"Expires": {
					type: schema.Date
				},
				"Scope": {
					type: schema.Text
				}
			},
			"extra": {
				TimeStamps:false
			}
		};
	},
	application: function(schema) {
		return {
			"model": {
				"ClientId": {
					type: schema.String
				},
				"UserId": {
					type: schema.String
				},
				"ClientType": {
					type: schema.String
				},
				"AuthorizationGrantType": {
					type: schema.String
				},
				"ClientSecret": {
					type: schema.String
				},
				"Name": {
					type: schema.String
				}
			},
			"extra": {}
		};
	}
};
const BasicStrategy = require('passport-http').BasicStrategy,
	// DigestStrategy = require('passport-http').DigestStrategy,
	ClientStrategy = require('passport-oauth2-client-password').Strategy;
let Router = require(process.cwd() + '/node_modules/koa-router');
let AuthModel = null;

module.exports = function(app) {
	for (let model in models) {
		AddModel(app.inflect.pluralize(model), models[model]);
	}
	// ORM.applications.create({
	// 	ClientId: 1,
	// 	UserId: 1,
	// 	ClientType: "Public",
	// 	AuthorizationGrantType: "password",
	// 	ClientSecret: "caca123",
	// 	Name: "WebAPP"
	// });

	const router = Router();
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
	server.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares) {}));
	server.exchange(oauth2orize.exchange.code(function(client, code, redirectURI) {}));
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
	router.post('/token/', passport.authenticate(['local'], {
			session: false
		}),
		function*() {
			this.state.user = yield ORM.applications.findOne({
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

	return router.middleware();
};
