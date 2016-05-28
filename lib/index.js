"use strict";
var Koa = require(process.cwd() + '/node_modules/koa');
require('colors');
var app = new Koa();
const path = require('path');
const inflections = require(process.cwd() + '/config/inflections');
const logger = require(path.join(process.cwd(),'/node_modules/koa-logger'));

app.inflect = require(process.cwd() + '/node_modules/i')();
inflections.irregular.forEach((inflect) => {
	app.inflect.inflections.irregular(inflect[0], inflect[1]);
});

if (process.env.NODE_ENV === "development") {
	app.use(logger());
}
app.use(require('./orm').initialize(app));
//app.use(require('./auth')(app));
console.log(app.render);
app.views = require('./views')(app);
console.log(app.render);
app.router = require('./router')(app);
app.protectedRouter = app.router[1];
app.router = app.router[0];

app.start = function (port, cb) {
	app.listen(port, function () {
		if (!(process.env.welcome === 'false') && process.env.NODE_ENV === "development") {
			console.log("a");
		} else if(!(process.env.welcome === 'false')){
			console.log("+Running on port " + port)
		}
		(cb || (() => {
			console.log("No Callback".red)
		}))();
	});
};

module.exports = app;
