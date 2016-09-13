"use strict";
//https://github.com/alexmingoia/koa-router
let Router = require(process.cwd() + '/node_modules/koa-router');
let fs = require('graceful-fs');
const path = require('upath');
const passport = require('koa-passport');
const server = require(path.join(process.cwd(), "config", "server"));
const subdomains = server.subdomains || ["www"];
const Promise = require('bluebird');

function* restify(modelinstance, modelname) {
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
			let relations = yield find({});
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
						record = record.toObject();
						record[relation[key]] = modelinstance.id;
						return record;
					})
				});
			}
		}
	}
	return model;

}

function* findmodel(next) {
	let pmodel = this.request.url.split('?')[0].split('/');
	pmodel.forEach((partialpath) => {
		if (this.model === undefined && this.db) {
			this.model = this.db[partialpath];
		}
	});
	yield next;
}

function* protect(next) {
	if (this.isAuthenticated()) {
		yield next;
	} else {
		yield passport.authenticate('bearer', {
			session: false
		}, function*(err, user) {
			if (err) {
				throw err
			}
			yield next;
			if (user === false) {
				ctx.status = 401
			}
		}).call(this, next);
	}
}
let router;
let secured;
const getrouter = function(spec) {
	spec = spec || "private";
	if (spec === "public") {
		return router;
	} else {
		return secured;
	}
}
const pOrp = function(routers, spec) {
	spec = spec || "private";
	return routers[spec];
}

function getQuery(filtergroup) {
	let group = [];
	for (let index in filtergroup) {
		let filter = filtergroup[index];
		if (index > 0) {
			group.push(filtergroup[index - 1].link === "or" ? "||" : "&&");
		}
		switch(filter.condition){
			case "like":
				group.push(`(this.${filter.key}.search(/${filter.value}/ig)>-1) `);
				break;
			case "in":
				group.push(`(["${filter.value.join('","')}"].indexOf(this.${filter.key})>-1)`);
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

function makeRestModel(options, mount_route, modelname) {
	let routers = {
		public: new Router(),
		private: new Router()
	};
	pOrp(routers, undefined).options(mount_route, allowmethods).options(path.join(mount_route, "*"), allowmethods);
	mount_route = mount_route.replace(/\/$/, "");
	pOrp(routers, options.get).get("/", function*() {
		let res = {},
			filteroptions={
				skip:0
			},
			filterset = this.query.filterset||[];
			filteroptions.limit = isNaN(this.query.size) ? (isNaN(server.pagination.limit)?50:server.pagination.limit):parseInt(this.query.size, 50);
		if (this.query.size) {
			delete this.query.size;
		}
		if (this.query.page) {
			filteroptions.skip = ((this.query.page * 1) - 1) * filteroptions.limit;
			delete this.query.page;
		}
		if (this.query.filterset) {
			delete this.query.filterset;
		}
		if (this.query) {
			let searchgroup = {filters:[],link:null};
			for (let item in this.query) {
				if (item.indexOf(".") > -1) {
					let terms = item.split(".");
					let prequery = {};
					prequery[terms[1]] = new RegExp(`.*${this.query[item]}.*`, "i");
					let finds = yield this.db[koaton_app.inflect.pluralize(terms[0])].find({
						where: prequery
					});
					searchgroup.filters.push({
						key:terms[0],
						condition:'in',
						value:finds.map((m) => {return m._id})
					});
				} else {
					searchgroup.filters.push({
						key:item,
						condition:'==',
						value: new RegExp(`.*${this.query[item]}.*`, "i")
					});
				}
				if(filterset.length>0){
					filterset[filterset.length-1].link = "and";
				}
				filterset.push(searchgroup);
			}
		}
		filterset = makeit(filterset) || function(){return true};
		console.log(filterset,filteroptions);
		if (filteroptions.skip >= 0) {
			res.meta = {
				total: yield this.model.rawCount(filterset)
			};
		}
		res[modelname] = yield this.model.rawWhere(filterset,filteroptions);
		this.body = res;
	});
	pOrp(routers, options.get).get(`/:id`, function*() {
		let res = {};
		res[koaton_app.inflect.singularize(modelname)] = yield restify(yield this.model.findById(this.params.id), koaton_app.inflect.singularize(modelname));
		this.body = res;
	});
	pOrp(routers, options.post).post("/", function*() {
		let res = {};
		res[koaton_app.inflect.singularize(modelname)] = yield this.model.create(this.request.body[koaton_app.inflect.singularize(modelname)]);
		this.body = res;
	});
	pOrp(routers, options.put).put(`/:id`, function*() {
		let body = this.request.body[koaton_app.inflect.singularize(modelname)];
		let record = yield this.model.findById(this.params.id);
		for (const prop in body) {
			if (record[prop] !== undefined) {
				record[prop] = body[prop];
			}
		}
		record.save();
		this.body = {};
		this.body[koaton_app.inflect.singularize(modelname)] = record;
	});
	pOrp(routers, options.delete).del(`/:id`, function*() {
		yield this.model.destroyById(this.params.id);
		this.body = {
			id: this.params.id
		};
	});
	router.use(path.join("/", mount_route), routers.public.routes());
	secured.use(path.join("/", mount_route), routers.private.routes());
}

function* allowmethods(next) {
	yield* next;
	this.response.set('Access-Control-Allow-Methods', 'OPTIONS,' + this.request.get('Access-Control-Request-Method'));
	this.status = 200;
	yield next;
	this.response.remove('ETag');
	this.response.remove('Content-Type');
	this.response.remove('Date');
}
let koaton_app;
module.exports.restify = makeRestModel;
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
			let domainrouter = routers;
			file = file.replace(".js", "");
			if (file.indexOf(".")) {
				let subdomain = file.split(".")[0];
				if (koaton_app.routers[subdomain] !== undefined) {
					domainrouter = koaton_app.routers[subdomain];
				}
			}
			require(ProyPath("koaton_modules", kmodule, "routes", file))(domainrouter, passport);
		});
	});
	readDir(controllersDir).forEach(function(file) {
		file = file.replace(".js", "");
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
		let domainrouter = routers;
		file = file.replace(".js", "");
		if (file.indexOf(".")) {
			let subdomain = file.split(".")[0];
			if (koaton_app.routers[subdomain] !== undefined) {
				domainrouter = koaton_app.routers[subdomain];
			}
		}
		require(ProyPath("routes", file))(domainrouter, passport);
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
