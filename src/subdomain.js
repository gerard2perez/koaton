import {routers} from './router';

const detectsubdomain = async function detectsubdomain(ctx, next) {
	ctx.subdomain = ctx.request.hostname.split('.');
	ctx.subdomain = ctx.subdomain.length >= 3 ? ctx.subdomain[0] : 'www';
	let origin = ctx.request.get('origin').replace('http://', '').split(':')[0].split('.');
	if (origin.length >= 3) {
		let reqo = ctx.request.get('origin').replace(origin[0] + '.', '').replace('http://', '');
		if (routers(origin[0]) !== undefined && reqo === configuration.hostname) {
			let port = ctx.request.host.split(':')[1];
			port = port ? ':' + port : '';
			ctx.response.set('Access-Control-Allow-Origin', 'http://' + origin.join('.') + port); //+(parseInt(server.port,10)===80?'':':'+server.port));
			ctx.response.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		}
	}
	await routers(ctx.subdomain).secured.call(ctx, next);
	await routers(ctx.subdomain).public.call(ctx, next);
	await next();
}
export default detectsubdomain;
