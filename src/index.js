/**
* @external {KoaContext} https://github.com/koajs/koa/blob/master/docs/api/context.md
*/
/**
* @external {KoaNext} https://github.com/koajs/koa/blob/master/docs/api/index.md#cascading
*/
/**
 * @external {JSURL} https://github.com/Sage/jsurl
 */
import 'colors';
import * as passport from 'koa-passport';
import { line1, line2 } from './support/consoleLines';
import './support/globals';
import include from './support/include';
import views from './views';
import * as KStatic from 'koa-static';
import * as bodyParser from 'koa-bodyparser';
import * as session from 'koa-session';
import * as helmet from 'koa-helmet';
import * as Koa from 'koa';
import * as path from 'path';
// TODO: This setup is for legacy compability
let App = new Koa();

/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
	const logger = require('koa-logger');
	App.use(logger());
}

let koaton = include(path.join(__dirname, 'middleware'));
const view = views(configuration.views);
const ServeStatic = KStatic(configuration.static.directory || /* istanbul ignore next */ ProyPath('public'), configuration.static.configuration);
const Localization = koaton.localization(App);
const oAuth2Server = koaton.oauth2server();
const BodyParser = bodyParser(configuration.server.bodyParser);
const Helmet = helmet(configuration.server.helmet);

App.use(koaton.orm.initialize(false));
koaton.oauth2server.setAuthModel();
koaton.oauth2server = oAuth2Server;

koaton.auth.loadSecurityContext();
const allowed = koaton.router.initialize();

App.keys = configuration.security.keys;
delete koaton.auth.initialize;
delete koaton.router.initialize;
delete koaton.orm.initialize;
delete koaton.server_models;

Object.defineProperty(App, 'helmet', {
	configurable: false,
	enumerable: true,
	get () {
		return Helmet;
	}
});
Object.defineProperty(App, 'session', {
	configurable: false,
	enumerable: true,
	get () {
		return session;
	}
});
Object.defineProperty(App, 'bodyparser', {
	configurable: false,
	enumerable: true,
	get () {
		return BodyParser;
	}
});

Object.defineProperty(App, 'views', {
	enumerable: true,
	get () {
		return view;
	}
});
Object.defineProperty(App, 'oAuth2Server', {
	enumerable: true,
	get () {
		return oAuth2Server;
	}
});
Object.defineProperty(App, 'subdomainrouter', {
	enumerable: true,
	get () {
		return koaton.subdomainrouter;
	}
});

Object.defineProperty(App, 'cached', {
	enumerable: true,
	get () {
		return koaton.cached;
	}
});

Object.defineProperty(App, 'passport', {
	enumerable: true,
	get () {
		return passport;
	}
});
Object.defineProperty(App, 'jsurl', {
	enumerable: true,
	get () {
		return koaton.jsurl;
	}
});
Object.defineProperty(App, 'static', {
	enumerable: true,
	get () {
		return ServeStatic;
	}
});
Object.defineProperty(App, 'localization', {
	enumerable: true,
	get () {
		return Localization[0];
	}
});
Object.defineProperty(App, 'i18nHelper', {
	enumerable: true,
	get () {
		return Localization[1];
	}
});
/* istanbul ignore next */
App.stack = function (...args) {
	for (const middleware in args) {
		App.use(middleware);
	}
};
App.start = function (port) {
	for (const route of allowed) {
		App.use(route);
	}
	return App.listen(port, () => {
		/* istanbul ignore else  */
		if (process.env.NODE_ENV === 'development') {
			line1(true);
			console.log();
			line2();
			console.log(`   Server running in ${process.cwd()}\n` +
				`   To see your App, visit http://${configuration.server.host}:${port}\n` +
				'   To shut down Koaton, press <CTRL> + C at any time.');
			line2();
			console.log();
			line1(true);
			console.log(`  Enviroment:\t\t${process.env.NODE_ENV.green}`);
			console.log(`  Port:\t\t\t${port.toString().green}`);
			line1();
		} else if (!(process.env.welcome === 'false')) {
			console.log('+Running on port ' + port);
		}
	});
};
module.exports = App;
