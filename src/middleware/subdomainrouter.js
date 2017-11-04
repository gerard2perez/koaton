import { routers } from './router';

/**
 * This middleware handles the routes.js file based on the subdomain requested by the user
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 */
export default async function subdomainrouter (ctx, next) {
	ctx.subdomain = 'www';
	for (const subdomain of configuration.server.subdomains) {
		if (ctx.request.host.indexOf(subdomain) === 0) {
			ctx.state.subdomain = subdomain;
			ctx.subdomain = subdomain;
			break;
		}
	}
	ctx.state.domain = ctx.request.host.replace(`${ctx.subdomain}.`, '');
	/* istanbul ignore next */
	let origin = ctx.headers.origin ? ctx.headers.origin : ctx.request.origin;
	if (origin.indexOf(configuration.server.host) > -1) {
		ctx.response.set('Access-Control-Allow-Origin', origin);
		ctx.response.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	}
	let res = await routers(ctx.subdomain).secured(ctx, next);
	if (res === 'koaton-no-route') {
		res = await routers(ctx.subdomain).public(ctx, next);
	}
	if (res === 'koaton-no-route') {
		await next();
	} else {
		if (ctx.state.nocache === undefined && ctx.method !== 'GET') {
			ctx.state.nocache = true;
		}
	}
}
