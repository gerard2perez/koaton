/**
 * Middleware for eTag generation (cached content)
 * @param {Koa} koaton - Instance of a Koa server.
 * @return {Object}
 * @property {i18n} i18nHelper - Instace of the i18n helper.
 * @property {function(ctx: KoaContext, next: KoaNext)} i18nMiddleware - Appends i18n to the ctx.state
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
	return {i18nHelper: i18n(koaton, config), i18nMiddleware: async function exporti18n (ctx, next) {
		global.i18n = ctx.i18n;
		await next();
	}};
}
