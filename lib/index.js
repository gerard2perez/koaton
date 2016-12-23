'use strict';

require('colors');

const passport = require('koa-passport');

const line1 = require('./support/consoleLines').line1;

const line2 = require('./support/consoleLines').line2;

require('./support/globals');

const include = require('./support/.include').default;

const inflector = require('./support/inflector').default;

// TODO: This setup is for legacy compability

let App = require(ProyPath('node_modules', 'koa'));
App = new App();

if (process.env.NODE_ENV === 'development') {
	const logger = require('koa-logger');
	App.use(logger());
}
let koaton = include(__dirname);
const views = koaton.views();

const oAuth2Server = koaton.oauth2server();
App.use(koaton.orm.initialize(false));
koaton.oauth2server.setAuthModel();
koaton.oauth2server = oAuth2Server;

koaton.auth.initialize();

App.use(koaton.router.initialize());

delete koaton.auth.initialize;
delete koaton.router.initialize;
delete koaton.orm.initialize;
delete koaton.server_models;

Object.defineProperty(App, 'inflector', {
	enumerable: true,
	get() {
		return inflector;
	}
});

Object.defineProperty(App, 'views', {
	enumerable: true,
	get() {
		return views;
	}
});
Object.defineProperty(App, 'oAuth2Server', {
	enumerable: true,
	get() {
		return oAuth2Server;
	}
});
Object.defineProperty(App, 'detectsubdomain', {
	enumerable: true,
	get() {
		return function* (next) {
			yield next;
		};
	}
});
Object.defineProperty(App, 'subdomainrouter', {
	enumerable: true,
	get() {
		return koaton.subdomain;
	}
});

Object.defineProperty(App, 'conditional', {
	enumerable: true,
	get() {
		return koaton.cached;
	}
});

Object.defineProperty(App, 'passport', {
	enumerable: true,
	get() {
		return passport;
	}
});

App.stack = function (...args) {
	for (const middleware in args) {
		App.use(middleware);
	}
};
App.start = function (port) {
	return App.listen(port, () => {
		if (process.env.NODE_ENV === 'development') {
			line1(true);
			console.log();
			line2();
			console.log(`   Server running in ${ process.cwd() }\n` + `   To see your App, visit http://${ configuration.host }:${ port }\n` + '   To shut down Koaton, press <CTRL> + C at any time.');
			line2();
			console.log();
			line1(true);
			console.log(`  Enviroment:\t\t${ process.env.NODE_ENV.green }`);
			console.log(`  Port:\t\t\t${ port.toString().green }`);
			line1();
		} else if (!(process.env.welcome === 'false')) {
			console.log('+Running on port ' + port);
		}
	});
};
module.exports = App;