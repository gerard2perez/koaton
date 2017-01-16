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
	return i18n(koaton, config);
}
