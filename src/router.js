import * as path from 'upath';
import * as Promise from 'bluebird';
import include from './support/include';

let koaton_app;
let router;
let secured;

const Router = requireSafe(ProyPath('node_modules', 'koa-router'),{});
const passport = requireSafe(ProyPath('node_modules', 'koa-passport'),{});

async function restify(modelinstance, modelname) {
	const relation = require(ProyPath("models", modelname))({}, {
		hasMany(field) {
			return field.split(".")[1]
		},
		belongsTo(field) {
			return field.split(".")[1]
		}
	}).relations;
	let model = modelinstance.toJSON();
	for (const key in relation) {
		if (typeof modelinstance[key] === "function") {
			let find = Promise.promisify(modelinstance[key].find, {
				context: modelinstance
			});
			let relations = await find({});
			if (scfg.relations_mode) {
				Object.defineProperty(model, key, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: relations.map((record) => {
						return record.id
					})
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

async function findmodel(ctx, next) {
	let pmodel = ctx.request.url.split('?')[0].split('/');
	for (const partialpath of pmodel) {
		console.log(partialpath);
		if (ctx.model === undefined && ctx.db) {
			ctx.model = ctx.db[partialpath];
		}
	}
	await next();
}

async function protect(ctx, next) {
	if (ctx.isAuthenticated()) {
		await next();
	} else {
		await passport.authenticate('bearer', {
			session: false
		}, async function(err, user) {
			if (err) {
				throw err
			}
			await next();
			if (user === false) {
				ctx.status = 401
			}
		}).call(ctx, next);
	}
}

const pOrp = function(routers, spec) {
	let router = spec || "private";
	return routers[router];
}

function getQuery(filtergroup) {
	let group = [];
	for (let index in filtergroup) {
		let filter = filtergroup[index];
		if (index > 0) {
			group.push(filtergroup[index - 1].link === "or" ? "||" : "&&");
		}
		switch (filter.condition) {
			case "like":
				group.push(`(this.${filter.key}.search(/${filter.value}/ig)>-1) `);
				break;
			case "in":
				group.push(`(["${filter.value.join('","')}"].indexOf(this.${filter.key})>-1)`);
				break;
			case "==":
				group.push(`this.${filter.key}.search(${filter.value})>-1`);
				break;
			default:
				group.push(`(this.${filter.key} ${filter.condition} "${filter.value}") `);
				break
		}
	}
	return group.join(' ');
}

function makeit(filterset) {
	let query = [];
	for (let index in filterset) {
		let filtergroup = filterset[index];
		if (index > 0) {
			query.push(filterset[index - 1].link === "or" ? "||" : "&&");
		}
		query.push("(" + getQuery(filtergroup.filters) + ")");
	}
	return query.join(' ');
}

function makeRestModel(options, route, modelname) {
	let routers = {
		public: new Router(),
		private: new Router()
	};

	let mount_route = route.replace(/\/$/, "");
	pOrp(routers, undefined).options(mount_route, allowmethods).options(path.join(mount_route, "*"), allowmethods);

	pOrp(routers, options.get).get("/", async function REST_GET(ctx, next) {
		let res = {},
			filteroptions = {
				skip: 0
			},
			filterset = ctx.query.filterset || [];
		filteroptions.limit = isNaN(this.query.size) ? (isNaN(server.pagination.limit) ? 50 : server.pagination.limit) : parseInt(this.query.size, 50);
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
				if (item.indexOf(".") > -1) {
					let terms = item.split(".");
					let prequery = {};
					prequery[terms[1]] = new RegExp(`.*${ctx.query[item]}.*`, "i");
					let finds = await ctx.db[koaton_app.inflect.pluralize(terms[0])].find({
						where: prequery
					});
					searchgroup.filters.push({
						key: terms[0],
						condition: 'in',
						value: finds.map((m) => {
							return m._id
						})
					});
				} else {
					searchgroup.filters.push({
						key: item,
						condition: '==',
						value: new RegExp(`.*${this.query[item]}.*`, "i")
					});
				}
				if (filterset.length > 0) {
					filterset[filterset.length - 1].link = "and";
				}
				filterset.push(searchgroup);
			}
		}
		filterset = makeit(filterset) || function() {
			return true
		};
		if (filteroptions.skip >= 0) {
			res.meta = {
				total: await ctx.model.rawCount(filterset)
			};
		}
		res[modelname] = await ctx.model.rawWhere(filterset, filteroptions);
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.get).get(`/:id`, async function REST_GET_ID(ctx, next) {
		let res = {};
		res[koaton_app.inflect.singularize(modelname)] = await restify(await ctx.model.findById(ctx.params.id), koaton_app.inflect.singularize(modelname));
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.post).post("/", async function REST_POST(ctx, next) {
		let res = {};
		res[koaton_app.inflect.singularize(modelname)] = await ctx.model.create(ctx.request.body[koaton_app.inflect.singularize(modelname)]);
		ctx.body = res;
		await next();
	});
	pOrp(routers, options.put).put(`/:id`, async function REST_PUT(ctx, next) {
		let body = ctx.request.body[koaton_app.inflect.singularize(modelname)];
		let record = await ctx.model.findById(ctx.params.id);
		for (const prop in body) {
			if (record[prop] !== undefined) {
				record[prop] = body[prop];
			}
		}
		record.save();
		ctx.body = {};
		ctx.body[koaton_app.inflect.singularize(modelname)] = record;
		await next();
	});
	pOrp(routers, options.delete).del(`/:id`, async function REST_DELETE(ctx, next) {
		await this.model.destroyById(ctx.params.id);
		ctx.body = {
			id: ctx.params.id
		};
		await next();
	});
	router.use(path.join("/", mount_route), routers.public.routes());
	secured.use(path.join("/", mount_route), routers.private.routes());
}

async function allowmethods(ctx, next) {
	await next();
	ctx.response.set('Access-Control-Allow-Methods', 'OPTIONS,' + ctx.request.get('Access-Control-Request-Method'));
	ctx.status = 200;
	ctx.response.remove('ETag');
	ctx.response.remove('Content-Type');
	ctx.response.remove('Date');
}

function initialize(koa) {
	let subdomainRouters = [];
	for (const subdomain of scfg.subdomains) {
		subdomainRouters[subdomain]={
			public: new Router(),
			protected: new Router()
		}
		subdomainRouters[subdomain].protected.use(protect);
		subdomainRouters[subdomain].public.use(findmodel);
		subdomainRouters[subdomain].protected.use(findmodel);
	}

}


// module.exports.restify = makeRestModel;
export default initialize;
/*
module.exports.initialize = function(app) {
	koaton_app = app;
	const routes = path.join(process.cwd(), "routes");
	koaton_app.routers = [];
	for (const idx in subdomains) {
		const subdomain = subdomains[idx];
		koaton_app.routers[subdomain] = {
			public: new Router(),
			protected: new Router()
		};
		// koaton_app.routers[subdomain].protected.use(passport.authenticate('bearer', { session: false }));
		koaton_app.routers[subdomain].protected.use(protect);
		koaton_app.routers[subdomain].public.use(findmodel);
		koaton_app.routers[subdomain].protected.use(findmodel);
	}
	let routers = koaton_app.routers.www;
	router = koaton_app.routers.www.public;
	secured = koaton_app.routers.www.protected;
	let controllersDir = ProyPath("controllers");


	let ember_apps_stack = {};
	let full_routes_stack = [];
	readDir(ProyPath("koaton_modules")).forEach((kmodule) => {
		let config = require(ProyPath("koaton_modules", kmodule, "config", "ember"));
		Object.keys(config).forEach((prop) => {
			config[prop].directory = path.join("..", "..", "koaton_modules", prop, "views", "ember_apps", config[prop].directory);
			ember_apps_stack[prop] = config[prop];
		});
		readDir(ProyPath("koaton_modules", kmodule, "routes")).forEach(function(file) {
			let [domainrouter, route] = [routers, file.replace(".js", "")];
			if (route.indexOf(".")) {
				let subdomain = route.split(".")[0];
				if (koaton_app.routers[subdomain] !== undefined) {
					domainrouter = koaton_app.routers[subdomain];
				}
			}
			require(ProyPath("koaton_modules", kmodule, "routes", file))(domainrouter, passport);
		});
	});
	readDir(controllersDir).forEach(function(file) {
		let controller = require(path.join(controllersDir, file));
		controller.Name = !controller.Name ? file : controller.Name;
		controller.Namespace = !controller.Namespace ? "" : controller.Namespace;
		if (controller.REST !== false) {
			if (controller.Pluralize !== false) {
				controller.Name = koaton_app.inflect.pluralize(controller.Name);
			}
			let mount_route = path.join("/", controller.Namespace, controller.Name, "/");
			makeRestModel(controller.REST, mount_route, controller.Name);
		}
	});
	readDir(routes).forEach(function(file) {
		let [domainrouter, route] = [routers, file.replace(".js", "")];
		if (route.indexOf(".")) {
			let subdomain = route.split(".")[0];
			if (koaton_app.routers[subdomain] !== undefined) {
				domainrouter = koaton_app.routers[subdomain];
			}
		}
		require(ProyPath("routes", route))(domainrouter, passport);
	});
	let apps = require(ProyPath("config", "ember"));
	Object.keys(apps).forEach((emberapp) => {
		ember_apps_stack[emberapp] = apps[emberapp];
	});
	Object.keys(ember_apps_stack).reverse().forEach((emberapp) => {
		const serveapp = function*(next) {
			yield next;
			if (!this.body) {
				yield this.render(path.join("ember_apps", ember_apps_stack[emberapp].directory));
			}
		};
		const sub = ember_apps_stack[emberapp].subdomain || "www";
		const approouter = new Router();
		approouter.get("/", serveapp)
			.get("*", serveapp);
		(ember_apps_stack[emberapp].access === "public" ? koaton_app.routers[sub].public : koaton_app.routers[sub].protected)
		.use(path.join("/", ember_apps_stack[emberapp].mount), approouter.routes());
		console.log(ember_apps_stack[emberapp]);
	});
	for (const subdomain in koaton_app.routers) {
		koaton_app.routers[subdomain] = {
			public: koaton_app.routers[subdomain].public.middleware(),
			protected: koaton_app.routers[subdomain].protected.middleware()
		};
	}
	//koaton_app.use(router.allowedMethods());

	return {
		public: koaton_app.routers.www.public,
		protected: koaton_app.routers.www.protected
	};
};
*/
