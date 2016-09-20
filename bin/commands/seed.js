'use strict';
module.exports = {
	cmd: "seed",
	description: "Run the seed of your project.",
	args: [],
	options: [

	],
	action: function*() {
		process.env.NODE_ENV = 'development';
		const Koa = require(process.cwd() + '/node_modules/koa');
		let app = new Koa();
		app.inflect = require(process.cwd() + '/node_modules/i')();
		try{
			yield require('../../lib/orm').initialize(app,true);
		}catch(e){
			console.log(e.stack);
		}
	}
};
