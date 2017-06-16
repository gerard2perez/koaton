import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import inflector from './inflector';
import * as path from 'upath';
import {RestModel} from './RestModel';

async function findmodel (ctx, next) {
	let pmodel = ctx.request.url.split('?')[0].split('/')[1];
	ctx.model = ctx.db[pmodel];
	await next();
}

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

const DeepGet = function (object, args) {
	let [action, ...rest] = args;
	if (action) {
		return DeepGet(object[action], rest);
	} else {
		return object;
	}
};

const DefaultView = function (view) {
	return async function DefaultView (ctx, next) {
		await ctx.render(`${view}.html`);
	};
};

class KoatonRouter {
	constructor (domain) {
		this.loc = '.';
		this.domain = domain;
		this.public = new Router();
		this.secured = new Router();
		this.secured.use(protect);
		this.public.use(findmodel);
		this.secured.use(findmodel);
	}
	location (location) {
		this.loc = location;
	}
	static findAction (router, binding) {
		let [controller, ...actions] = binding.split('.');
		let action = DeepGet(requireSafe(ProyPath(router.loc, 'controllers', controller), {}).default, actions) || DefaultView(controller);
		return action;
	}
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
	get (...args) {
		return this.request.bind(this, 'get')(...args);
	}
	post (...args) {
		return this.request.bind(this, 'post')(...args);
	}
	delete (...args) {
		return this.request.bind(this, 'delete')(...args);
	}
	put (...args) {
		return this.request.bind(this, 'put')(...args);
	}
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

export default KoatonRouter;
