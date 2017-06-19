import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import inflector from './inflector';
import * as path from 'upath';
import {RestModel} from './RestModel';
/**
 * Reads the model that is requested based on the route
 * and appends model to ctx.state
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 * @param {JSURL} ctx.model - reference attached. DEPRECATED.
 * @param {JSURL} ctx.state.model - reference attached.
 */
async function findmodel (ctx, next) {
	let pmodel = ctx.request.url.split('?')[0].split('/')[1];
	ctx.model = ctx.db[pmodel];
	ctx.state.model = ctx.state.db[pmodel];
	await next();
}
/**
 * Makes a route only accessible if user is logged in
 * and appends model to ctx.state
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 * @return {Object} {status:401, body: null}
 */
async function protect (ctx, next) {
	if (ctx.isAuthenticated()) {
		await next();
	} else {
		await passport.authenticate('bearer', {
			session: false
		}, async function (err, user) {
			/* istanbul ignore if */
			if (err) {
				throw err;
			}
			if (user === false) {
				ctx.body = null;
				ctx.status = 401;
			} else {
				await next();
			}
		})(ctx, next);
	}
}

/**
 * Return the requested property recursive
 * @private
 * @param {Object} object
 * @param {String} action
 * @param {...String} rest
 */
const DeepGet = function (object, action, ...rest) {
	if (action) {
		return DeepGet(object[action], ...rest);
	} else {
		return object;
	}
};
/**
 * Creates a default handler for the route (render html view)
 * @private
 * @param {string} view - Default view name
 * @return {async function(ctx: KoaContext, next: KoaNext)} renders the view
 */
const DefaultView = function (view) {
	return async function DefaultView (ctx, next) {
		await ctx.render(`${view}.html`);
	};
};
/**
 * This class helps to build routes for a specific subdomain
 * @class KoatonRouter
 * @param {String} subdomain
 */
export default class KoatonRouter {
	/**
	 * @param {String} subdomain - subdomain reference for the router
	 */
	constructor (subdomain) {
		/** path location of the router */
		this.loc = '.';
		/**
		 * subdomain name
		 * @type {String}
		 */
		this.subdomain = subdomain;
		/**
		 * Router for public access
		 * @type {KoaRouter}
		 */
		this.public = new Router();
		/**
		 * Router for private access
		 * @type {KoaRouter}
		 */
		this.secured = new Router();
		this.secured.use(protect);
		this.public.use(findmodel);
		this.secured.use(findmodel);
	}
	/**
	 * Update the location of the router
	 * @param {String} location
	 */
	location (location) {
		this.loc = location;
	}
	/**
	 * find what is the best mathching action for the given router and binding
	 * @param {KoaRouter}
	 * @param {String} binding - a dot separated action. example: 'school.get'
	 * @return {async function(ctx: KoaContext, next: KoaNext)} handles the route
	 */
	static findAction (router, binding) {
		let [controller, ...actions] = binding.split('.');
		let action = DeepGet(requireSafe(ProyPath(router.loc, 'controllers', controller), {}).default, ...actions) || DefaultView(controller);
		return action;
	}
	/**
	 * Append a method to a route in the specified verb.
	 * @private
	 * @param {Verb} method
	 * @param {String} url
	 * @param {String|function} binding='index' - You can use a string to refer to a controller or pass a function to work as handler
	 * @param {Boolean} [secured=false]
	 * @return {KoaRouter}
	 */
	request (method, url, binding = 'index', secured = false) {
		if (typeof binding === 'boolean') {
			secured = binding;
			binding = 'index';
		} else if (typeof binding === 'function') {
			(secured ? this.secured : this.public)[method](url, binding);
			return this;
		}
		let Action = KoatonRouter.findAction(this, binding);
		(secured ? this.secured : this.public)[method](url, Action);
		return this;
	}
	/**
	 * Create a route for a GET request
	 * @param {String} url
	 * @param {String|function} binding='index' - You can use a string to refer to a controller or pass a function to work as handler
	 * @param {Boolean} [secured=false]
	 * @return {KoaRouter}
	 */
	get (...args) {
		return this.request.bind(this, 'get')(...args);
	}
	/**
	 * Create a route for a POST request
	 * @param {String} url
	 * @param {String|function} binding='index' - You can use a string to refer to a controller or pass a function to work as handler
	 * @param {Boolean} [secured=false]
	 * @return {KoaRouter}
	 */
	post (...args) {
		return this.request.bind(this, 'post')(...args);
	}
	/**
	 * Create a route for a DELETE request
	 * @param {String} url
	 * @param {String|function} binding='index' - You can use a string to refer to a controller or pass a function to work as handler
	 * @param {Boolean} [secured=false]
	 * @return {KoaRouter}
	 */
	delete (...args) {
		return this.request.bind(this, 'delete')(...args);
	}
	/**
	 * Create a route for a PUT request
	 * @param {String} url
	 * @param {String|function} binding='index' - You can use a string to refer to a controller or pass a function to work as handler
	 * @param {Boolean} [secured=false]
	 * @return {KoaRouter}
	 */
	put (...args) {
		return this.request.bind(this, 'put')(...args);
	}
	/**
	 * Creates a REST route, all the rules of this routes will be given the controller of the given route
	 * @param {String} url
	 * @param {String} model=url - If not model present it will try to match the url with a model
	 * @return {KoaRouter}
	 */
	rest (url, model) {
		if (model === undefined) {
			model = url;
			url = undefined;
		}
		let controller = requireSafe(ProyPath(this.loc, 'controllers', model), {}).default;
		controller = Object.assign({
			Name: model,
			Namespace: '',
			REST: false,
			Pluralize: true
		}, controller);
		if (controller.REST) {
			/* istanbul ignore else */
			if (controller.Pluralize) {
				controller.Name = inflector.pluralize(controller.Name);
			}
			let mountRoute = path.join('/', controller.Namespace, url || controller.Name, '/');
			let options = controller.REST === 'public' ? {
				get: 'public',
				post: 'public',
				put: 'public',
				delete: 'public'
			} : {};
			let router = RestModel(options, mountRoute, controller.Name);
			this.public.use(router.path, router.public.routes());
			this.secured.use(router.path, router.private.routes());
		}
		return this;
	}
}
