"use strict";
const path = require("path");
const passport = require(path.join(process.cwd(), "node_modules","koa-passport"));
const ORM = require("./orm").orm;
const AuthConfig = require(path.join(process.cwd(), "config", "security"));



module.exports = function AuthenticationMiddleware(app){
	const Model = ORM[AuthConfig.model];
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});
	passport.deserializeUser(function(id, done) {
		Model.findById(id, function(err, user) {
			done(err, user);
		});
	});
	Object.keys(AuthConfig.strategies).forEach((strategy)=>{
		const STR = AuthConfig.strategies[strategy];
		try{
			let Strategy = require(path.join(process.cwd(),"node_modules",`passport-${strategy}`));
			if(strategy==="local"){
				passport.use(new Strategy((username,password,done)=>{
					let query={};
					query[STR.user] = username;
					query[STR.password] = password;
					let user = Model.findOne(query);
					console.log(user);
					done(null,user);
				}));
			}else{
				console.log("Not Implemented Yet");
			}

		}catch(err){
			console.log(app.inflect.camelize(`${strategy}_strategy`)+" not found");
			console.log(`You might try npm i passport-${strategy}`);
		}
		console.log();
	});
	return 	function *(next){
		yield next;
	}
};
