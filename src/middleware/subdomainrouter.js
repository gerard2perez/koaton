import { routers } from './router';

const subdomainrouter = async function subdomainrouter (ctx, next) {
	let [subdomain = 'www'] = ctx.request.subdomains;
	ctx.subdomain = subdomain;
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
};
export default subdomainrouter;
