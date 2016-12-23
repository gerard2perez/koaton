import { sync as glob } from 'glob';
import * as path from 'upath';
import * as Promise from 'bluebird';
import * as passport from 'koa-passport';
import * as Router from 'koa-router';
import inflector from './support/inflector';

let subdomainRouters;

async function restify (modelinstance, modelname) {
	const relation = require(ProyPath('models', inflector.singularize(modelname)))({}, {
		hasMany (field) {
			return field.split('.')[1];
		},
		belongsTo (field) {
			return field.split('.')[1];
		}
	}).relations;
	let model = modelinstance.toJSON ? modelinstance.toJSON() : modelinstance;
	for (const key in Object.keys(modelinstance.relations || {})) {
		if (typeof modelinstance[key] === 'function') {
			let find = Promise.promisify(modelinstance[key].find, {
				context: modelinstance
			});
			let relations = await find({});
			if (configuration.relations_mode) {
				Object.defineProperty(model, key, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: relations.map(record => record.id)
				});
			} else {
				Object.defineProperty(model, key, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: relations.map((record) => {
						let property = record.toObject();
						property[relation[key]] = modelinstance.id;
						return property;
					})
				});
			}
		}
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

function getQuery (filtergroup) {
	let group = [];
	for (let index in filtergroup) {
		let filter = filtergroup[index];
		if (index > 0) {
			group.push(filtergroup[index - 1].link === 'or' ? '||' : '&&');
		}
		switch (filter.condition) {
			case 'like':
				group.push(`(this.${filter.key}.search(/${filter.value}/ig)>-1) `);
				break;
			case 'in':
				group.push(`(['${filter.value.join('', '')}'].indexOf(this.${filter.key})>-1)`);
				break;
			case '==':
				group.push(`this.${filter.key}.search(${filter.value})>-1`);
				break;
			default:
				group.push(`(this.${filter.key} ${filter.condition} '${filter.value}') `);
				break;
		}
	}
	return group.join(' ');
}

function makeit (filterset) {
	let query = [];
	for (let index in filterset) {
		let filtergroup = filterset[index];
		if (index > 0) {
			query.push(filterset[index - 1].link === 'or' ? '||' : '&&');
		}
		query.push('(' + getQuery(filtergroup.filters) + ')');
	}
	return query.join(' ');
}

function makeRestModel (options, route, modelname) {
	let routers = {
		public: new Router(),
		private: new Router()
	};

	let mountRoute = route.replace(/\/$/, '');

	// pOrp(routers, 'public').options(mountRoute, allowmethods).options(path.join(mountRoute, '*'), allowmethods);
	pOrp(routers, options.get).get('/', async function REST_GET (ctx, next) {
		let res = {},
			filteroptions = {
				skip: 0
			},
			filterset = ctx.query.filterset || [];
		filteroptions.limit = isNaN(this.query.size) ? (isNaN(configuration.pagination.limit) ? 50 : configuration.pagination.limit) : parseInt(this.query.size, 50);
		if (ctx.query.size) {
			delete ctx.query.size;
		}
		if (ctx.query.page) {
			filteroptions.skip = ((ctx.query.page * 1) - 1) * filteroptions.limit;
			delete ctx.query.page;
		}
		if (ctx.query.filterset) {
			delete ctx.query.filterset;
		}
		if (ctx.query) {
			let searchgroup = {
				filters: [],
				link: null
			};
			for (let item in ctx.query) {
				if (item.indexOf('.') > -1) {
					let terms = item.split('.');
					let prequery = {};
					prequery[terms[1]] = new RegExp(`.*${ctx.query[item]}.*`, 'i');
					let finds = await ctx.db[inflector.pluralize(terms[0])].find({
						where: prequery
					});
					searchgroup.filters.push({
						key: terms[0],
						condition: 'in',
						value: finds.map(m => m._id)
					});
				} else {
					searchgroup.filters.push({
						key: item,
						condition: '==',
						value: new RegExp(`.*${this.query[item]}.*`, 'i')
					});
				}
				if (filterset.length > 0) {
					filterset[filterset.length - 1].link = 'and';
				}
				filterset.push(searchgroup);
			}
		}
		filterset = makeit(filterset) || 'return true;';
		if (filteroptions.skip >= 0) {
			res.meta = {
				total: await ctx.model.rawCount(filterset)
			};
		}
		let rawmodels = (await ctx.model.rawWhere(filterset, filteroptions));
		for (const idx in rawmodels) {
			rawmodels[idx] = await restify(rawmodels[idx], modelname);
		}
		res[modelname] = rawmodels;
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.get).get('/:id', async function REST_GET_ID (ctx, next) {
		let res = {};
		res[inflector.singularize(modelname)] = await restify(await ctx.model.findById(ctx.params.id), inflector.singularize(modelname));
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.post).post('/', async function REST_POST (ctx, next) {
		let res = {};
		let model = ctx.request.body[inflector.singularize(modelname)];
		let entity = await ctx.model.create(model);
		let modelRelations = {};
		for (const relation of Object.keys(ctx.model.relations)) {
			const relations = model[relation];
			if (relations) {
				let child = ctx.model.relations[relation].modelTo;
				let foreignKey = ctx.model.relations[relation].keyTo;
				let foreignValue = entity[ctx.model.relations[relation].keyFrom];
				switch (ctx.model.relations[relation].type) {
					case 'hasMany':
						modelRelations[relation] = [];
						for (const related of relations) {
							related[foreignKey] = foreignValue;
							if (typeof related === 'object') {
								modelRelations[relation].push((await child.create(related)).id);
							} else {
								let childmodel = await child.findById(related);
								childmodel[foreignKey] = foreignValue;
								childmodel.save();
								modelRelations[relation].push(related);
							}
						}
						break;
				}
			}
		}
		entity = Object.assign({}, entity.toJSON(), modelRelations);
		res[inflector.singularize(modelname)] = entity;
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

// async function allowmethods(ctx, next) {
// 	await next();
// 	ctx.response.set('Access-Control-Allow-Methods', 'OPTIONS,' + ctx.request.get('Access-Control-Request-Method'));
// 	ctx.status = 200;
// 	ctx.response.remove('ETag');
// 	ctx.response.remove('Content-Type');
// 	ctx.response.remove('Date');
// }

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
		let route = routepath.replace('.js', ''),
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
