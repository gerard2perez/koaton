"use strict";
require('colors');
const Koa = require(process.cwd() + '/node_modules/koa');
let app = new Koa();
const path = require('upath');
const inflections = require(process.cwd() + '/config/inflections');
const logger = require(path.join(process.cwd(), '/node_modules/koa-logger'));
const welcome = require('./welcome');
const server = require(path.join(process.cwd(),"config","server"));
app.inflect = require(process.cwd() + '/node_modules/i')();
inflections.irregular.forEach((inflect) => {
	app.inflect.inflections.irregular(inflect[0], inflect[1]);
});
inflections.plural.forEach((inflect) => {
	app.inflect.inflections.plural(inflect[0], inflect[1]);
});

if (process.env.NODE_ENV === "development") {
	app.use(logger());
}
if (require(process.cwd() + '/config/models').connection !== undefined) {
	app.use(require('./orm').initialize(app));
	app.use(require('./auth').initialize(app));
}
app.views = require('./views')(app);
if (require(process.cwd() + '/config/models').connection !== undefined) {
	app.oAuth2Server = require('./server')(app);
}
app.detectsubdomain = function*(next) {
	this.subdomain = this.request.hostname.split(".");
	this.subdomain = this.subdomain.length >= 3 ? this.subdomain[0] : "www";
	yield next;
};
app.conditional = function*(next) {
	yield * next;
	if (this.fresh) {
		this.response.set('Cache-Control', "public," + this.response.get('Cache-Control'));
		this.response.remove('Last-Modified');
		this.status = 304;
		this.body = null;
	}
};
app.subdomainrouter=function * (next){
	let origin = this.request.get("origin").replace("http://","").split(":")[0].split(".");
    if(origin.length ===3 ){
        if(app.routers[origin[0]]!==undefined && (origin[1]+"."+origin[2])===server.hostname){
			let port = this.request.host.split(":")[1];
			port = port ? ":"+port:"";
            this.response.set('Access-Control-Allow-Origin',"http://"+origin.join(".")+port);//+(parseInt(server.port,10)===80?"":":"+server.port));
			this.response.set('Access-Control-Allow-Headers',"Origin, X-Requested-With, Content-Type, Accept");
        }
    }
    yield app.routers[this.subdomain].protected.call(this, next);
    yield app.routers[this.subdomain].public.call(this, next);
    yield next;
};
app.router = require('./router')(app);
app.start = function(port) {
	app.listen(port, function() {
		if (process.env.NODE_ENV === "development") {
			welcome.line1(true);
			console.log();
			welcome.line2();
			console.log(`   Server running in ${process.cwd()}\n` +
				`   To see your app, visit ` + `http://localhost:${port}\n`.underline +
				`   To shut down Koaton, press <CTRL> + C at any time.`);
			welcome.line2();
			console.log();
			welcome.line1(true);
			console.log(`  Enviroment:\t\t${process.env.NODE_ENV.green}`);
			console.log(`  Port:\t\t\t${port.toString().green}`);
			welcome.line1();
		} else if (!(process.env.welcome === 'false')) {
			console.log("+Running on port " + port)
		}
	});
};
module.exports = app;
