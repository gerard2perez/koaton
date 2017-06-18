/**
 * Middleware for eTag generation (cached content)
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 */
export default function localization (koaton) {
	let config = Object.assign({}, {
		queryKey: 'locale',
		directory: 'locales',
		locales: ['en'],
		modes: [
			'query',
			'subdomain'
		]
	}, configuration.server.localization);
	const locale = require('koa-locale');
	const i18n = require('koa-i18n');
	locale(koaton, config.queryKey);
	return [i18n(koaton, config), async function exporti18n (ctx, next) {
		global.i18n = ctx.i18n;
		await next();
	}];
}
