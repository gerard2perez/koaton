import 'colors';
import * as passport from 'koa-passport';
import {
	line1,
	line2
} from './support/consoleLines';
import './support/globals';
import include from './support/.include';
import inflector from './support/inflector';

//TODO: This setup is for legacy compability

let app = require(ProyPath('node_modules', 'koa'));
app = new app();

if (process.env.NODE_ENV === 'development') {
	const logger = require('koa-logger');
	app.use(logger());
}
console.log(1);
let koaton = include(__dirname);
console.log(2);
const views = koaton.views();

app.use(koaton.orm.initialize(false));
koaton.auth.initialize();

app.use(koaton.router.initialize());
const oAuth2Server = koaton.oauth2server = koaton.oauth2server();

delete koaton.auth.initialize;
delete koaton.router.initialize;
delete koaton.orm.initialize;
delete koaton.server_models;

Object.defineProperty(app, 'inflector', {
	enumerable: true,
	get() {
		return inflector;
	}
});

Object.defineProperty(app, 'views', {
	enumerable: true,
	get() {
		return views;
	}
});
Object.defineProperty(app, 'oAuth2Server', {
	enumerable: true,
	get() {
		return oAuth2Server;
	}
});
Object.defineProperty(app, 'detectsubdomain', {
	enumerable: true,
	get() {
		return async function(ctx, next) {
			await next();
		};
	}
});
Object.defineProperty(app, 'subdomainrouter', {
	enumerable: true,
	get() {
		return koaton.subdomain;
	}
});

Object.defineProperty(app, 'conditional', {
	enumerable: true,
	get() {
		return koaton.cached;
	}
});

Object.defineProperty(app, 'passport', {
	enumerable: true,
	get() {
		return passport;
	}
});

app.stack = function(...args) {
	for (const middleware in args) {
		app.use(middleware);
	}
}
app.start = function(port) {
	// try {
	// 	fs.readdirSync('koaton_modules').forEach((Module) => {
	// 		requireSafe(ProyPath('koaton_modules', Module, 'app.js'), () => {})(app);
	// 	});
	// } catch (e) {
	// 	//do nothing;
	// }
	return app.listen(port, () => {
		if (process.env.NODE_ENV === 'development') {
			line1(true);
			console.log();
			line2();
			console.log(`   Server running in ${process.cwd()}\n` +
				`   To see your app, visit http://${configuration.host}:${port}\n` +
				`   To shut down Koaton, press <CTRL> + C at any time.`);
			line2();
			console.log();
			line1(true);
			console.log(`  Enviroment:\t\t${process.env.NODE_ENV.green}`);
			console.log(`  Port:\t\t\t${port.toString().green}`);
			line1();
		} else if (!(process.env.welcome === 'false')) {
			console.log('+Running on port ' + port)
		}
	});
};
module.exports = app;
