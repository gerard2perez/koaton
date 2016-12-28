import { sync as glob } from 'glob';
import * as path from 'upath';
import * as passport from 'koa-passport';
import * as Router from 'koa-router';
import inflector from './support/inflector';
import toMongooseStringQuery from './support/toMongooseStringQuery';
import * as Promise from 'bluebird';

let subdomainRouters;

async function restify (modelinstance, /* istanbul ignore next */ relations = {}) {
	let model = modelinstance.toJSON ? modelinstance.toJSON() : modelinstance;
	for (const key of Object.keys(relations)) {
		const child = relations[key].modelTo;
		let query = {where: {}};
		query.where[relations[key].keyTo] = modelinstance[relations[key].keyFrom];
		let relationContent = [];
		switch (relations[key].type) {
			case 'hasMany':
				relationContent = await child.all(query);
				break;
			case 'belongsTo':
				let obj = await child.findOne(query);
				if (obj) {
					relationContent.push(await child.findOne(query));
				}
				break;
		}
		relationContent = relationContent.filter(record => record !== null);
		relationContent = configuration.relationsMode === 'ids' ? relationContent.map(record => record.id) : relationContent.map(record => {
			record = record.toJSON();
			delete record[relations[key].keyTo];
			return record;
		});
		if (relations[key].type === 'belongsTo') {
			relationContent = relationContent[0];
		}
		Object.defineProperty(model, key, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: relationContent
		});
	}
	return model;
}

async function findmodel (ctx, next) {
	let pmodel = ctx.request.url.split('?')[0].split('/')[1];
	ctx.model = ctx.db[pmodel];
	await next();
}

async function protect (ctx, next) {
	const _ctx = ctx;
	if (_ctx.isAuthenticated()) {
		await next();
	} else {
		await passport.authenticate('bearer', {
			session: false
		}, async function (err, user) {
			/* istanbul ignore if */
			if (err) {
				throw err;
			}
			await next();
			if (user === false) {
				_ctx.body = null;
				_ctx.status = 401;
			}
		}).call(_ctx, next);
	}
}

const pOrp = function (routers, spec) {
	let router = spec || 'private';
	return routers[router];
};
async function REST_POST_SINGLE (Model, model) {
	let entity = await Model.create(model);
	let modelRelations = {};
	for (const relation of Object.keys(Model.relations)) {
		const relations = model[relation];
		if (relations) {
			let child = Model.relations[relation].modelTo;
			let foreignKey;
			let foreignValue;
			switch (Model.relations[relation].type) {
				case 'hasMany':
					foreignKey = Model.relations[relation].keyTo;
					foreignValue = entity[Model.relations[relation].keyFrom];
					modelRelations[relation] = [];
					for (const related of relations) {
						if (typeof related === 'object') {
							related[foreignKey] = foreignValue;
							modelRelations[relation].push((await child.create(related)).id);
						} else {
							let data = {};
							data[foreignKey] = foreignValue;
							let res = await child.update({
								_id: related
							}, data);
							/* istanbul ignore else */
							if (res.nModified) {
								modelRelations[relation].push(related);
							}
						}
					}
					break;
				case 'belongsTo':
					foreignKey = Model.relations[relation].keyFrom;
					let related;
					if (typeof relations === 'object') {
						related = await child.create(relations);
					} else {
						related = await child.findById(relations);
					}
					foreignValue = related[Model.relations[relation].keyTo];
					let res = await Model.update({
						_id: entity.id
					}, {[foreignKey]: foreignValue});
					/* istanbul ignore else */
					if (res.nModified) {
						modelRelations[relation] = related.id;
					}
					break;
			}
		}
	}
	return Object.assign({}, entity.toJSON(), modelRelations);
}

function makeRestModel (options, route, modelname) {
	let routers = {
		public: new Router(),
		private: new Router()
	};

	let mountRoute = route.replace(/\/$/, '');
	pOrp(routers, options.get).get('/', async function REST_GET (ctx, next) {
		let res = {},
			filteroptions = {
				skip: 0
			};
		filteroptions.limit = isNaN(ctx.query.size) ? (isNaN(configuration.pagination.limit) ? /* istanbul ignore next */ 50 : configuration.pagination.limit) : parseInt(this.query.size, 10);
		if (ctx.query.size) {
			delete ctx.query.size;
		}
		if (ctx.query.page) {
			filteroptions.skip = ((ctx.query.page * 1) - 1) * filteroptions.limit;
			delete ctx.query.page;
		}
		let filterset = await toMongooseStringQuery(ctx.query, ctx.model, ctx.db);
		console.log(`db.books.find(function(){${filterset}}).pretty()`);
		res.meta = {
			page: Math.floor((filteroptions.skip / filteroptions.limit)) + 1,
			page_size: filteroptions.limit,
			total: await ctx.model.rawCount(filterset)
		};
		let rawmodels = (await ctx.model.rawWhere(filterset, filteroptions));
		for (const idx in rawmodels) {
			rawmodels[idx] = await restify(rawmodels[idx], ctx.model.relations);
		}
		res[modelname] = rawmodels;
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.get).get('/:id', async function REST_GET_ID (ctx, next) {
		let res = {};
		res[inflector.singularize(modelname)] = await restify(await ctx.model.findById(ctx.params.id), ctx.model.relations);
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.post).post('/', async function REST_POST (ctx, next) {
		let res = {};
		let model = ctx.request.body[inflector.singularize(modelname)];
		model = model ? [model] : ctx.request.body[modelname];
		let entities = [];
		for (const entity of model) {
			let created = await REST_POST_SINGLE(ctx.model, entity);
			entities.push(created);
		}
		if (entities.length === 1) {
			res[inflector.singularize(modelname)] = entities[0];
		} else {
			res[modelname] = entities;
		}
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.post).post('/:id/:child', async function REST_POST_ID (ctx, next) {
		let parent = await ctx.model.findById(ctx.params.id);
		if (typeof parent[ctx.params.child] !== 'function') {
			ctx.status = 402;
		} else {
			let child = ctx.model.relations[ctx.params.child];
			switch (child.type) {
				case 'hasMany':
					ctx.request.body[child.keyTo] = parent[[child.keyFrom]];
					await child.modelTo.create(ctx.request.body);
					break;
				case 'belongsTo':
					break;
			}
		}
		let res = {};
		res[inflector.singularize(modelname)] = await restify(parent, ctx.model.relations);
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.put).put('/:id', async function REST_PUT (ctx, next) {
		let body = ctx.request.body[inflector.singularize(modelname)];
		let record = await ctx.model.findById(ctx.params.id);
		for (const prop in body) {
			if (record[prop] !== undefined) {
				record[prop] = body[prop];
			}
		}
		record.save();
		ctx.body = {};
		ctx.body[inflector.singularize(modelname)] = record;
		await next();
	});
	pOrp(routers, options.delete).del('/:id', async function REST_DELETE (ctx, next) {
		await this.model.destroyById(ctx.params.id);
		ctx.body = {
			id: ctx.params.id
		};
		await next();
	});
	subdomainRouters.www.public.use(path.join('/', mountRoute), routers.public.routes());
	subdomainRouters.www.secured.use(path.join('/', mountRoute), routers.private.routes());
}

function initialize () {
	subdomainRouters = {};
	for (const subdomain of configuration.subdomains) {
		subdomainRouters[subdomain] = {
			public: new Router(),
			secured: new Router()
		};
		subdomainRouters[subdomain].secured.use(protect);
		subdomainRouters[subdomain].public.use(findmodel);
		subdomainRouters[subdomain].secured.use(findmodel);
	}

	let routes = glob('koaton_modules/**/routes/*.js').concat(glob('routes/**/*.js'));
	let controllers = glob('koaton_modules/**/controllers/*.js').concat(glob('controllers/**/*.js'));
	let embers = glob('koaton_modules/**/config/ember.js').concat('config/ember.js');

	// Loads all the controllers
	for (const controllerPath of controllers) {
		let controller = require(ProyPath(controllerPath));
		controller = Object.assign({
			Name: path.basename(controllerPath).replace('.js', ''),
			Namespace: '',
			REST: false,
			Pluralize: true
		}, controller);
		if (controller.REST) {
			/* istanbul ignore else */
			if (controller.Pluralize) {
				controller.Name = inflector.pluralize(controller.Name);
			}
			let mountRoute = path.join('/', controller.Namespace, controller.Name, '/');
			let options = controller.REST === 'public' ? {
				get: 'public',
				post: 'public',
				put: 'public',
				delete: 'public'
			} : {};
			makeRestModel(options, mountRoute, controller.Name);
		}
	}

	// Load all routes
	for (const routepath of routes) {
		let route = path.basename(routepath).replace('.js', ''),
			domainrouter = subdomainRouters.www;
		if (route.indexOf('.') > -1) {
			let subdomain = route.split('.')[0];
			if (subdomainRouters[subdomain] !== undefined) {
				domainrouter = subdomainRouters[subdomain];
			}
		}
		require(ProyPath(routepath))(domainrouter, passport);
	}
	const allow = subdomainRouters.www.public.allowedMethods();
	const serveapp = function (directory) {
		return async function serveEmberAPP (ctx, next) {
			await next();
			if (!ctx.body) {
				await ctx.render(directory);
			}
		};
	};
	// Load all ember apps
	for (const ember of embers) {
		const config = require(ProyPath(ember));
		for (const app in config) {
			let emberapp = config[app];

			if (ember.indexOf('koaton_modules') > -1) {
				emberapp.directory = path.join('..', '..', 'koaton_modules', app, 'views', 'ember_apps', config[app].directory);
			} else {
				emberapp.directory = path.join('ember_apps', config[app].directory);
			}

			const sub = emberapp.subdomain || 'www',
				approouter = new Router(),
				serveemberapp = serveapp(emberapp.directory);

			approouter.get('/', serveemberapp).get('*', serveemberapp);
			(emberapp.access === 'public' ? subdomainRouters[sub].public : subdomainRouters[sub].secured)
			.use(path.join('/', emberapp.mount), approouter.routes());
		}
	}

	// Prepares all routers
	for (const idx in subdomainRouters) {
		subdomainRouters[idx].public = subdomainRouters[idx].public.middleware();
		subdomainRouters[idx].secured = subdomainRouters[idx].secured.middleware();
	}
	return allow;
}

function routers (domain) {
	return subdomainRouters[domain];
}

export {
	initialize,
	restify,
	routers
};
