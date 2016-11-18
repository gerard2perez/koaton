
import * as fs from 'fs';
import './scfg';
import view from './views';
import oauth2server from './server';
import {initialize as init_orm} from './orm';
import {initialize as init_auth} from './auth';
import {initialize as init_router} from './router';
import {line1,line2} from './support/consoleLines';
import inflector from './support/inflector';

let app = new require(ProyPath('/node_modules','koa'))();

const logger = require(ProyPath('node_modules','koa-logger'));
const server = require(ProyPath("config", "server"));
const hasconnections = requireSafe(ProyPath('config','models'),null) !== null;

Object.defineProperty(app,'inflect',{
	get(){
		return inflector;
	}
})

//Enable Debugger if we're in development
if (process.env.NODE_ENV === "development") {
	app.use(logger());
}

if (hasconnections) {
	app.use(init_orm(app));
	init_auth(app)
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
app.detectsubdomain = async function detectsubdomain(ctx, next) {
	ctx.subdomain = ctx.request.hostname.split(".");
	ctx.subdomain = ctx.subdomain.length >= 3 ? ctx.subdomain[0] : "www";
	await next();
};

app.conditional = async function conditional(ctx, next) {
	ctx.hola=true;
	await next();
	if (ctx.fresh) {
		ctx.response.set('Cache-Control', "public," + ctx.response.get('Cache-Control'));
		ctx.response.remove('Last-Modified');
		ctx.status = 304;
		ctx.body = null;
	}
	//});
};
app.subdomainrouter = async function subdomainrouter(ctx, next) {
	let origin = ctx.request.get("origin").replace("http://", "").split(":")[0].split(".");
	if (origin.length >= 3) {
		let reqo = ctx.request.get("origin").replace(origin[0] + ".", "").replace("http://", "");
		if (app.routers[origin[0]] !== undefined && reqo === server.hostname) {
			let port = ctx.request.host.split(":")[1];
			port = port ? ":" + port : "";
			ctx.response.set('Access-Control-Allow-Origin', "http://" + origin.join(".") + port); //+(parseInt(server.port,10)===80?"":":"+server.port));
			ctx.response.set('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept");
		}
	}
	await app.routers[ctx.subdomain].protected.call(ctx, next);
	await app.routers[ctx.subdomain].public.call(ctx, next);
	await next();
};
app.router = init_router(app);

app.start = function(port) {
	fs.access("koaton_modules", fs.RF_OK | fs.W_OK, (err) => {
		if (!err) {
			readDir("koaton_modules").forEach((Module) => {
				requireSafe(ProyPath("koaton_modules", Module, "app.js"), () => {})(app);
			});
		}
		app.listen(port, () => {
			if (process.env.NODE_ENV === "development") {
				line1(true);
				console.log();
				line2();
				console.log(`   Server running in ${process.cwd()}\n` +
					`   To see your app, visit http://${scfg.hostname}:${port}\n` +
					`   To shut down Koaton, press <CTRL> + C at any time.`);
				line2();
				console.log();
				line1(true);
				console.log(`  Enviroment:\t\t${process.env.NODE_ENV.green}`);
				console.log(`  Port:\t\t\t${port.toString().green}`);
				line1();
			} else if (!(process.env.welcome === 'false')) {
				console.log("+Running on port " + port)
			}
		});
	});

};

Object.defineProperty(app,'routers',{

});


export default app;
