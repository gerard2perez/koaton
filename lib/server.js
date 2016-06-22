"use strict";
const passport = require('koa-passport');
const path = require('upath');
const ORM = require('./orm').orm;
const AuthConfig = require(path.join(process.cwd(), "config", "security"));
const oauth2orize = require('oauth2orize-koa');
const server = oauth2orize.createServer();
const secret = require('../bin/secret');
const AddModel = require('./orm').addModel;
const Promise = require('bluebird');
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
			"extra": {}
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
	ClientStrategy = require('passport-oauth2-client-password').Strategy;
let Router = require(process.cwd() + '/node_modules/koa-router');
let AuthModel = null;
const getuser = function(username, password, done) {
	console.log("getuser");
	let query = {};
	query.name = username;
	query.password = password;
	AuthModel.findOne({
		where: query
	}).then((user) => {

		done(user === null ? "No user found" : null, user);
	}, (err) => {
		done(err, null);
	});
}

const hash = Promise.promisify(require('bcrypt').hash);
const unhash = Promise.promisify(require('bcrypt').compare);

const createUser=function*(username,password,body){
	body[AuthConfig.username] = username;
	body[AuthConfig.password] = yield hash(password,15);

	return yield AuthModel.create(body);
}

module.exports = function(app) {
	for(let model in models){
		AddModel(app.inflect.pluralize(model),models[model]);
	}
	// ORM.applications.create({
	// 	ClientId:1,
	// 	UserId:1,
	// 	ClientType:"Public",
	// 	AuthorizationGrantType:"password",
	// 	ClientSecret:"caca123",
	// 	Name:"WebAPP"
	// });
	const router = Router();
	AuthModel = ORM[app.inflect.pluralize(AuthConfig.model)];
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
	server.exchange(oauth2orize.exchange.password(function(client, username, password,scope,body){
		console.log(username, password,scope,body);
		return AuthModel.findOne({where:{name:username,password:password}}).then((user)=>{
			if(client!==null && user !==null){
				return secret(16).then((token)=>{
					return ORM.oauth2accesstokens.create({
					 	"UserId":user._id,
					 	"Token": token.toString('hex'),
					 	"ApplicationId":client._id,
					 	"Expires": 3600,
					 	"Scope":"read write"
					}).then((access)=>{
						const response = [
							access.Token,
							{
								expires_in:access.Expires
								// scope:access.Scope
							}
						];
						console.log(response);
						return response;
					});
				});
			}else{
				return null;
			}
		});


		// code = yield AuthorizationCode.findOne(code);
		// if (client.id !== code.clientId) {
		// 	return false;
		// }
		// if (redirectURI !== code.redirectUri) {
		// 	return false;
		// }
		// var token = utils.uid(256);
		// var at = new AccessToken(token, code.userId, code.clientId, code.scope);
		// yield at.save();
		// return token;
	}));
	router.post('/token/', passport.authenticate(['local', 'oauth2-client-password'], {
			session: false
		}),
		function*() {
			this.state.user = yield ORM.applications.findOne({where:{ClientId:this.query.client_id}});
			const type = this.request.body.grant_type;
			if(this.state.user === null || type!==this.state.user.AuthorizationGrantType){
				this.response.status = 406;
			}else{
				yield server._exchange(type, this, function(err) { throw err; });
			}
		},
		server.errorHandler());

router.post('/singup/',function*(){
	const user = yield createUser(this.request.body.username,this.request.body.password,this.request.body);
	if(user!==null){
		this.response.status = 201;
	}else{
		this.response.status = 500;
	}
});
	// router.get('/bearer/',
	// 	server.authorize(convert(function*(clientID, redirectURI) {
	// 		console.log("authorize");
	// 		let client = yield this.db[AuthModel].findById(clientID);
	// 		console.log(client);
	// 		if (!client) {
	// 			return false;
	// 		}
	// 		if (!client.redirectUri !== redirectURI) {
	// 			return false;
	// 		}
	// 		return [client, client.redirectURI];
	// 	})),
	// 	function(ctx, b, c) {
	// 		console.log(ctx, b, c);
	// 		res.render('dialog', {
	// 			transactionID: ctx.state.oauth2.transactionID,
	// 			user: ctx.state.user,
	// 			client: ctx.state.oauth2.client
	// 		});
	// 	});
	return router.middleware();
};
