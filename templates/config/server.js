"use strict";
var path = require('path');
var env = process.env.NODE_ENV || 'development';
var port = process.env.port || 62626;
var host = 'http://localhost' + (port != 80 ? ':' + port : '');

var DEBUG = env !== 'production'

module.exports = {
	pagination:{
		limit:50
	},
	subdomains:[
		"www"
	],
	//http://koajs.com/#application,
	host:{
		dev:'localhost',
		prod:'127.0.0.1'
	},
	name: "koaton",
	keys: ['9184f115438655076a7675827bbfa1d98745217f'],
	env: env,
	port: port,
	//https://github.com/koajs/static#options
	static: {
		directory: path.resolve(__dirname, '../public')
	},
	//https://github.com/koajs/body-parser#options
	bodyparser: {},
	//https://github.com/koajs/generic-session#options
	session: {
		maxAge: 1000 * 60 * 60 * 24,
		key:{{key}}
	},
	//https://github.com/rkusa/koa-passport
	auth: {
		//https://github.com/jaredhanson/passport-facebook
		facebook: {
			clientID: 'your-client-id',
			clientSecret: 'your-secret',
			callbackURL: host + '/auth/facebook/callback'
		},
	},
	//https://github.com/koajs/ejs
	view: {
		map: {
			html: 'handlebars'
		}
		//cache: DEBUG ? false : 'memory',
		//locals: require('./view-locals'),
		//filters: require('./view-filters'),
		//layout: 'layouts/main',
	},
	error: {
		view: 'error/error',
		layout: 'layouts/error',
		custom: {
			401: 'error/401',
			403: 'error/403',
			404: 'error/404',
		},
	},
}
