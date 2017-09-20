import { sync as glob } from 'glob';
import * as path from 'upath';
import * as passport from 'koa-passport';
import KoatonRouter from '../support/KoatonRouter';
import * as Router from 'koa-router';

let subdomainRouters,
	allowed = [];

/**
 * Creates the public handler for a EmberApp.
 * @private
 * @param {string} directory - The path where the EmberApp is located relative to public folder
 * @return {async function(ctx: KoaContext, next: KoaNext)} renders the view
 */
function serveapp (directory) {
	/* istanbul ignore next */
	return async function serveEmberAPP (ctx, next) {
		await next();
		if (!ctx.body) {
			await ctx.render(directory);
		}
	};
}
/**
 * Checks if the current route is valid matches with the given router
 * @private
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 * @return {Object|String} if route does not math it will return 'koa-no-route'
 */
function EvalRoute (ctx, next) {
	let router = this;
	let matched = router.match(router.opts.routerPath || ctx.routerPath || ctx.path, ctx.method);
	/* istanbul ignore else */
	if (ctx.matched) {
		ctx.matched.push.apply(ctx.matched, matched.path);
	} else {
		ctx.matched = matched.path;
	}
	if (matched.route) {
		return this.middleware()(ctx, next);
	} else {
		return Promise.resolve('koaton-no-route');
	}
}
/**
 * Reads all the routes.js files and creates a {KoaRouter} for each subdomain
 */
export function initialize () {
	subdomainRouters = {
		www: new KoatonRouter('www')
	};
	let routers = glob('koaton_modules/**/routes.js').concat(glob('routes.js'));
	for (const router of routers) {
		let location = path.dirname(router);
		let PackageSubdomains = require(ProyPath(location, 'config', 'server.js'), {default: { subdomains: [] }}).default.subdomains;
		for (const subdomain of PackageSubdomains) {
			if (!subdomainRouters[subdomain]) {
				subdomainRouters[subdomain] = new KoatonRouter(subdomain);
			}
			subdomainRouters[subdomain].location(location);
		}
		require(ProyPath(router)).default(subdomainRouters, passport);
	}

	let embers = glob('koaton_modules/**/config/ember.js').concat('config/ember.js');
	// Load all ember apps
	for (const ember of embers) {
		const config = require(ProyPath(ember)).default;
		for (const app in config) {
			let emberapp = config[app];
			if (ember.indexOf('koaton_modules') > -1) {
				emberapp.directory = path.join('..', 'koaton_modules', app, 'views', 'ember_apps', config[app].directory);
			} else {
				emberapp.directory = path.join('ember_apps', config[app].directory);
			}
			const sub = emberapp.subdomain || 'www',
				approouter = new Router(),
				serveemberapp = serveapp(emberapp.directory);

			approouter.get('/', serveemberapp).get('*', serveemberapp);
			(emberapp.access === 'public' ? subdomainRouters[sub].public : subdomainRouters[sub].secured).use(path.join('/', emberapp.mount), approouter.routes());
		}
	}
	for (const idx in subdomainRouters) {
		allowed.push(subdomainRouters[idx].public.allowedMethods({
			throw: true
		}));
		allowed.push(subdomainRouters[idx].secured.allowedMethods({
			throw: true
		}));
		subdomainRouters[idx].public = EvalRoute.bind(subdomainRouters[idx].public);
		subdomainRouters[idx].secured = EvalRoute.bind(subdomainRouters[idx].secured);
	}
}

/**
 * Return the requested {KoaRouter}
 * @param {string} subdomain
 * @return {KoaRouter}
 */
export function routers (subdomain) {
	return subdomainRouters[subdomain];
}
/**
 * Return all the OPTIONS handlebars
 * @return {function[]} Return an array of KoaMiddleware function that handles the options response
 */
export function options () {
	return allowed;
}
