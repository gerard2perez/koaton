"use strict";
const path = require("path");
const passport = require("koa-passport");
const ORM = require("./orm").orm;
const AuthConfig = require(path.join(process.cwd(), "config", "security"));



module.exports = function AuthenticationMiddleware(app){
	const Model = ORM[app.inflect.pluralize(AuthConfig.model)];
	passport.serializeUser(function(user, done) {
		console.log("serializeUser");
		done(null, user._id);
	});
	passport.deserializeUser(function(id, done) {
		console.log("deserializeUser");
		console.log(id);
		Model.findById(id).then((user)=>{
			done(null,user);
		},(err)=>{
			done(err,null);
		});
	});

	Object.keys(AuthConfig.strategies).forEach((strategy)=>{
		const STR = AuthConfig.strategies[strategy];
		try{
			//let component = path.join(process.cwd(),"node_modules",STR.package || `passport-${strategy}`);
			let component = STR.package || `passport-${strategy}`;
			let Strategy = require(component).Strategy;
			switch(strategy){
				case "local":
				passport.use(new Strategy(function(username,password,done){
					console.log("lcal get");
					let query={};
					query[STR.user] = username;
					query[STR.password] = password;
					Model.findOne({where:query}).then((user)=>{
						done(null,user);
					},(err)=>{
						done(err);
					});
				}));
				break;
				default:
					passport.use (new Strategy(STR.callback));
				break;
			}
		}catch(err){
			console.log(err.stack);
			console.log(app.inflect.camelize(`${strategy}_strategy`)+" not found");
			console.log(`You might try npm i passport-${strategy}`);
		}
		console.log();
	});
	return function *(next){
		// this.passport = passport;
		yield next;
	};
};
