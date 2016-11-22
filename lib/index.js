'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

const fs = require('fs-extra');

require('./support/globals');

const view = require('./views').default;

const oauth2server = require('./server').default;

const init_orm = require('./orm').initialize;

const init_auth = require('./auth').initialize;

const init_router = require('./router').initialize;

const routers = require('./router').routers;

const line1 = require('./support/consoleLines').line1;

const line2 = require('./support/consoleLines').line2;

const inflector = require('./support/inflector').default;

let app = require(ProyPath('node_modules', 'koa'));
app = new app();

const logger = require(ProyPath('node_modules', 'koa-logger'));
const server = require(ProyPath("config", "server"));
const hasconnections = requireSafe(ProyPath('config', 'models'), null) !== null;

Object.defineProperty(app, 'inflector', {
	get() {
		return inflector;
	}
});

//Enable Debugger if we're in development
// if (process.env.NODE_ENV === "development") {
app.use(logger());
// }

if (hasconnections) {
	app.use(init_orm(false));
	init_auth(app);
	// app.use();
}
app.views = view(app);
if (hasconnections) {
	app.oAuth2Server = oauth2server(app);
}

/**
 * @param {Object} ctx  - node current context
 * @param {MyClass} next - await this promise function.
 */
app.detectsubdomain = function* detectsubdomain(next) {
	this.subdomain = this.request.hostname.split(".");
	this.subdomain = this.subdomain.length >= 3 ? this.subdomain[0] : "www";
	yield next;
};

app.conditional = function* conditional(next) {
	yield next;
	if (this.fresh) {
		this.response.set('Cache-Control', "public," + this.response.get('Cache-Control'));
		this.response.remove('Last-Modified');
		this.status = 304;
		this.body = null;
	}
	//});
};
app.subdomainrouter = function* subdomainrouter(next) {
	let origin = this.request.get("origin").replace("http://", "").split(":")[0].split(".");
	if (origin.length >= 3) {
		let reqo = this.request.get("origin").replace(origin[0] + ".", "").replace("http://", "");
		if (app.routers[origin[0]] !== undefined && reqo === server.hostname) {
			let port = this.request.host.split(":")[1];
			port = port ? ":" + port : "";
			this.response.set('Access-Control-Allow-Origin', "http://" + origin.join(".") + port); //+(parseInt(server.port,10)===80?"":":"+server.port));
			this.response.set('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept");
		}
	}
	yield routers(this.subdomain).secured.call(this, next);
	yield routers(this.subdomain).public.call(this, next);
	yield next;
};
init_router(app);
// app.use();

app.start = function (port) {
	fs.access("koaton_modules", fs.RF_OK | fs.W_OK, err => {
		if (!err) {
			fs.readdirSync("koaton_modules").forEach(Module => {
				requireSafe(ProyPath("koaton_modules", Module, "app.js"), () => {})(app);
			});
		}
		app.listen(port, () => {
			if (process.env.NODE_ENV === "development") {
				line1(true);
				console.log();
				line2();
				console.log(`   Server running in ${ process.cwd() }\n` + `   To see your app, visit http://${ scfg.hostname }:${ port }\n` + `   To shut down Koaton, press <CTRL> + C at any time.`);
				line2();
				console.log();
				line1(true);
				console.log(`  Enviroment:\t\t${ process.env.NODE_ENV.green }`);
				console.log(`  Port:\t\t\t${ port.toString().green }`);
				line1();
			} else if (!(process.env.welcome === 'false')) {
				console.log("+Running on port " + port);
			}
		});
	});
};

Object.defineProperty(app, 'routers', {});

exports.default = app;