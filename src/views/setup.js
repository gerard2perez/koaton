import { sync as glob } from 'glob';
import { basename } from 'upath';
import * as fs from 'fs';
import KoatonRouter from '../support/KoatonRouter';
/**
 * Initialize layout support for handlebars, bundle helper, i18n helpers
 * @type {function} handlebars - returns the handlebars instance
 */
function handlebars () {
	const Handlebars = require(ProyPath('node_modules', 'handlebars'));
	const layouts = require(ProyPath('node_modules', 'handlebars-layouts'));
	Handlebars.registerHelper(layouts(Handlebars));
	// Bundles
	Handlebars.registerHelper('bundle', function (bundle) {
		if (Kmetadata.bundles[bundle] === undefined) {
			return '';
		}
		return Kmetadata.bundles[bundle].toString();
	});
	// Localition
	Handlebars.registerHelper('i18n', function (key, locale, helper) {
		if (helper) {
			let loc = i18n.getLocale();
			i18n.setLocale(locale);
			let res = i18n.__(key);
			i18n.setLocale(loc);
			return res;
		} else {
			return i18n.__(key);
		}
	});
	const layoutFiles = glob(ProyPath('views', 'layouts', '*.handlebars')).concat(glob(ProyPath('koaton_modules', '**', 'views', 'layouts', '*.handlebars')));
	for (const file of layoutFiles) {
		Handlebars.registerPartial(basename(file).replace('.handlebars', ''), fs.readFileSync(file, 'utf8'));
	}
	return Handlebars;
}
/**
 * Initialize nunjucks engine: bundle helper
 * @type {function} nunjucks - returns the nunjucks instance
 */
function nunjucks () {
	const nunjucks = require(ProyPath('node_modules', 'nunjucks'));
	const env = new nunjucks.Environment();
	class Link {
		constructor () {
			this.tags = ['link'];
		}
		parse (parser, nodes, lexer) {
			// get the tag token
			let tok = parser.nextToken();

			// parse the args and move after the block end. passing true
			// as the second arg is required if there are no parentheses
			let args = parser.parseSignature(null, true);
			parser.advanceAfterBlockEnd(tok.value);

			// parse the body and possibly the error block, which is optional
			let body = parser.parseUntilBlocks('error', 'endlink');
			let errorBody = null;

			if (parser.skipSymbol('error')) {
				parser.skip(lexer.TOKEN_BLOCK_END);
				errorBody = parser.parseUntilBlocks('endlink');
			}

			parser.advanceAfterBlockEnd();

			// See above for notes about CallExtension
			return new nodes.CallExtension(this, 'run', args, [body, errorBody]);
		}
		run (context, url, body, errorBody) {
			let route = KoatonRouter.AllRoutes(context.ctx.subdomain).map(exp => {
				let variables = (exp[1].match(/\$/g) || []).length;
				let matches = (url.match(exp[0]) || []).length - 1;
				if (matches === variables && url.replace(...exp).indexOf('.') === -1) {
					return url.replace(...exp);
				}
			}).filter(r => !!r);
			route = url === 'home' ? '/' : route[0];
			let content;
			console.log(context.ctx.path, context.ctx.route, url, route);
			let active = context.ctx.route === url || context.ctx.path === route;
			if (context.ctx.path === route) {
				content = `<a class="active">${body()}</a>`;
			} else {
				content = `<a href="${route}" class="${active ? 'active' : ''}">${body()}</a>`;
			}
			return new nunjucks.runtime.SafeString(content);
		}
	}
	env.addFilter('bundle', function (bundle) {
		if (Kmetadata.bundles[bundle] === undefined) {
			return '';
		}
		return new nunjucks.runtime.SafeString(Kmetadata.bundles[bundle].toString());
	});
	env.addFilter('i18n', function (key, locale) {
		if (locale) {
			let loc = i18n.getLocale();
			i18n.setLocale(locale);
			let res = i18n.__(key);
			i18n.setLocale(loc);
			return res;
		} else {
			return i18n.__(key);
		}
	});
	// env.addFilter('link', function(name, callback) {
	// 	console.log(name);
	// 	console.log(callback);
	// 	callback();
	// }, true);
	env.addExtension('Link', new Link());
	return env;
}

export { handlebars, nunjucks };
