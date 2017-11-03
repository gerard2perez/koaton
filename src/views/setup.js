import { sync as glob } from 'glob';
import { basename } from 'upath';
import * as fs from 'fs';
import KoatonRouter from '../support/KoatonRouter';
import deprecate from '../support/deprecate';

/**
 * Translate the given work to the current locale of to a one specified in the arguments.
 * @param {object} ctx The current context in wich the helper is executing.
 * @param {String} url The url to genereate the link.
 * @return {String} The helper content.
 */
function makeLink (ctx, url, render) {
	let route = KoatonRouter.AllRoutes(ctx.subdomain).map(exp => {
		let variables = (exp[1].match(/\$/g) || []).length;
		let matches = (url.match(exp[0]) || []).length - 1;
		if (matches === variables && url.replace(...exp).indexOf('.') === -1) {
			return url.replace(...exp);
		}
	}).filter(r => !!r);
	route = url === 'home' ? '/' : route[0];
	let content;
	let active = ctx.route === url || ctx.path === route;
	if (ctx.path === route) {
		content = `<a class="active">${render(this)}</a>`;
	} else {
		content = `<a href="${route}" class="${active ? 'active' : ''}">${render()}</a>`;
	}
	return content;
}
/**
 * Translate the given work to the current locale of to a one specified in the arguments.
 * @param {String} key The key to use in the translation sheet.
 * @param {String} locale Custom locale to translate the key.
 * @return {String} localized key.
 */
function translate (key, locale) {
	if (locale) {
		let loc = i18n.getLocale();
		i18n.setLocale(locale);
		let res = i18n.__(key);
		i18n.setLocale(loc);
		return res;
	} else {
		return i18n.__(key);
	}
}
const _i18n = deprecate('i18n will be deprecated in future versions of koaton, please use t instead', translate);

/**
 * Initialize layout support for handlebars, bundle helper, i18n helpers
 * @type {function} handlebars - returns the handlebars instance
 */
function handlebars () {
	const Handlebars = require(ProyPath('node_modules', 'handlebars'));
	const layouts = require(ProyPath('node_modules', 'handlebars-layouts'));
	Handlebars.registerHelper(layouts(Handlebars));
	Handlebars.registerHelper('link', function (url, helper) {
		return makeLink(helper.data.root, url, helper.fn);
	});
	// Bundles
	Handlebars.registerHelper('bundle', function (bundle) {
		if (Kmetadata.bundles[bundle] === undefined) {
			return '';
		}
		return Kmetadata.bundles[bundle].toString();
	});
	// Localition
	Handlebars.registerHelper('i18n', _i18n);
	Handlebars.registerHelper('t', translate);
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
			/* istanbul ignore next */
			if (parser.skipSymbol('error')) {
				parser.skip(lexer.TOKEN_BLOCK_END);
				errorBody = parser.parseUntilBlocks('endlink');
			}

			parser.advanceAfterBlockEnd();

			// See above for notes about CallExtension
			return new nodes.CallExtension(this, 'run', args, [body, errorBody]);
		}
		run (context, url, body, errorBody) {
			return new nunjucks.runtime.SafeString(makeLink(context.ctx, url, body));
		}
	}
	env.addFilter('bundle', function (bundle) {
		if (Kmetadata.bundles[bundle] === undefined) {
			return '';
		}
		return new nunjucks.runtime.SafeString(Kmetadata.bundles[bundle].toString());
	});
	env.addFilter('i18n', _i18n);
	env.addFilter('t', translate);
	env.addExtension('Link', new Link());
	return env;
}

export { handlebars, nunjucks };
