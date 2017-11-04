/**
* @external {KoaContext} https://github.com/koajs/koa/blob/master/docs/api/context.md
*/
/**
* @external {KoaNext} https://github.com/koajs/koa/blob/master/docs/api/index.md#cascading
*/
/**
 * @external {JSURL} https://github.com/Sage/jsurl
 */
/**
  * @external {KoaRouter} https://github.com/alexmingoia/koa-router
  */
/**
 * @external {Verb} http://www.restapitutorial.com/lessons/httpmethods.html
 */
/**
 * @external {CaminteJS} http://www.camintejs.com/en/guide
 */
import 'colors';
import * as passport from 'koa-passport';
import { line1, line2 } from './support/consoleLines';
import './support/globals';
import include from './support/include';
import * as views from './views';
import * as KStatic from 'koa-static';
import * as bodyParser from 'koa-bodyparser';
import * as session from 'koa-session';
import * as helmet from 'koa-helmet';
import * as Koa from 'koa';
import * as path from 'path';
import * as fs from 'fs';

/** @ignore */
let App = new Koa(),
	koaton = include(path.join(__dirname, 'middleware'));

/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
	const logger = require('koa-logger');
	App.use(logger());
}

App.use(koaton.error);
/** @ignore */
const ServeStatic = KStatic(configuration.static.directory || /* istanbul ignore next */ ProyPath('public'), configuration.static.configuration),
	{i18nHelper, i18nMiddleware} = koaton.localization(App),
	oAuth2Server = koaton.oauth2server.oauth2server(),
	BodyParser = bodyParser(configuration.server.bodyParser),
	Helmet = helmet(configuration.server.helmet);
views.initialize();
koaton.orm.initializeORM(false);
App.use(koaton.orm.ormMiddleware);
koaton.oauth2server.setAuthModel();
koaton.oauth2server = oAuth2Server;

koaton.auth.loadSecurityContext();
koaton.router.initialize();

App.keys = configuration.security.keys;
delete koaton.auth.initialize;
delete koaton.router.initialize;
delete koaton.orm.initialize;
delete koaton.server_models;
Object.defineProperty(App, 'helmet', {
	configurable: false,
	enumerable: false,
	get () {
		return Helmet;
	}
});
Object.defineProperty(App, 'session', {
	configurable: false,
	enumerable: false,
	get () {
		return session;
	}
});
Object.defineProperty(App, 'bodyparser', {
	configurable: false,
	enumerable: false,
	get () {
		return BodyParser;
	}
});

Object.defineProperty(App, 'views', {
	enumerable: false,
	get () {
		return views.viewsMiddleware;
	}
});
Object.defineProperty(App, 'oAuth2Server', {
	enumerable: false,
	get () {
		return oAuth2Server;
	}
});
Object.defineProperty(App, 'subdomainrouter', {
	enumerable: false,
	get () {
		return koaton.subdomainrouter;
	}
});

Object.defineProperty(App, 'cached', {
	enumerable: false,
	get () {
		return koaton.cached;
	}
});

Object.defineProperty(App, 'passport', {
	enumerable: false,
	get () {
		return passport;
	}
});
Object.defineProperty(App, 'jsurl', {
	enumerable: false,
	get () {
		return koaton.jsurl;
	}
});
Object.defineProperty(App, 'static', {
	enumerable: false,
	get () {
		return ServeStatic;
	}
});
Object.defineProperty(App, 'localization', {
	enumerable: false,
	get () {
		return i18nMiddleware;
	}
});
Object.defineProperty(App, 'i18nHelper', {
	enumerable: false,
	get () {
		return i18nHelper;
	}
});

/**
 * function to make you server avaliable
 * @param {int} port -  the port where to listen defaults to 62626
 * @return {http.Server}
 */
App.start = function (port) {
	for (const route of koaton.router.options()) {
		App.use(route);
	}
	let callback = () => {
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
	};
	const https = configuration.server.https;
	/* istanbul ignore next */
	if (https && https.key && https.cert) {
		return require('https').createServer({
			key: fs.readFileSync(https.key),
			cert: fs.readFileSync(https.cert)
		}, App.callback()).listen(port, callback);
	} else {
		return App.listen(port, callback);
	}
};
/**
 * Export the original Koa server with some properties attached
 * @type {Koa}
 * @property {function} start
 */
export { App as default };
