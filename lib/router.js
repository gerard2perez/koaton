'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

const glob = require('glob').sync;

const path = require('upath');

const Promise = require('bluebird');

const inflector = require('./support/inflector').default;

let subdomainRouters;

const Router = require(ProyPath('node_modules', 'koa-router'));
const passport = require(ProyPath('node_modules', 'koa-passport'));

function* restify(modelinstance, modelname) {
	const relation = require(ProyPath("models", modelname))({}, {
		hasMany(field) {
			return field.split(".")[1];
		},
		belongsTo(field) {
			return field.split(".")[1];
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
					value: relations.map(function (record) {
						return record.id;
					})
				});
			} else {
				Object.defineProperty(model, key, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: relations.map(function (record) {
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

function* findmodel(next) {
	let pmodel = this.request.url.split('?')[0].split('/');
	for (const partialpath of pmodel) {
		if (this.model === undefined && this.db) {
			this.model = this.db[partialpath];
		}
	}
	yield next;
}

function* protect(next) {
	if (this.isAuthenticated()) {
		yield next;
	} else {
		yield passport.authenticate('bearer', {
			session: false
		}, function* (err, user) {
			if (err) {
				throw err;
			}
			yield next;
			if (user === false) {
				this.status = 401;
			}
		}).call(this, next);
	}
}

const pOrp = function (routers, spec) {
	let router = spec || "private";
	return routers[router];
};

function getQuery(filtergroup) {
	let group = [];
	for (let index in filtergroup) {
		let filter = filtergroup[index];
		if (index > 0) {
			group.push(filtergroup[index - 1].link === "or" ? "||" : "&&");
		}
		switch (filter.condition) {
			case "like":
				group.push(`(this.${ filter.key }.search(/${ filter.value }/ig)>-1) `);
				break;
			case "in":
				group.push(`(["${ filter.value.join('","') }"].indexOf(this.${ filter.key })>-1)`);
				break;
			case "==":
				group.push(`this.${ filter.key }.search(${ filter.value })>-1`);
				break;
			default:
				group.push(`(this.${ filter.key } ${ filter.condition } "${ filter.value }") `);
				break;
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

	pOrp(routers, options.get).get("/", function* REST_GET(next) {
		let res = {},
		    filteroptions = {
			skip: 0
		},
		    filterset = this.query.filterset || [];
		filteroptions.limit = isNaN(this.query.size) ? isNaN(scfg.pagination.limit) ? 50 : scfg.pagination.limit : parseInt(this.query.size, 50);
		if (this.query.size) {
			delete this.query.size;
		}
		if (this.query.page) {
			filteroptions.skip = (this.query.page * 1 - 1) * filteroptions.limit;
			delete this.query.page;
		}
		if (this.query.filterset) {
			delete this.query.filterset;
		}
		if (this.query) {
			let searchgroup = {
				filters: [],
				link: null
			};
			for (let item in this.query) {
				if (item.indexOf(".") > -1) {
					let terms = item.split(".");
					let prequery = {};
					prequery[terms[1]] = new RegExp(`.*${ this.query[item] }.*`, "i");
					let finds = yield this.db[inflector.pluralize(terms[0])].find({
						where: prequery
					});
					searchgroup.filters.push({
						key: terms[0],
						condition: 'in',
						value: finds.map(function (m) {
							return m._id;
						})
					});
				} else {
					searchgroup.filters.push({
						key: item,
						condition: '==',
						value: new RegExp(`.*${ this.query[item] }.*`, "i")
					});
				}
				if (filterset.length > 0) {
					filterset[filterset.length - 1].link = "and";
				}
				filterset.push(searchgroup);
			}
		}
		filterset = makeit(filterset) || function () {
			return true;
		};
		if (filteroptions.skip >= 0) {
			res.meta = {
				total: yield this.model.rawCount(filterset)
			};
		}
		res[modelname] = yield this.model.rawWhere(filterset, filteroptions);
		this.body = res;
		yield next;
	});
	pOrp(routers, options.get).get(`/:id`, function* REST_GET_ID(next) {
		let res = {};
		res[inflector.singularize(modelname)] = yield restify((yield this.model.findById(this.params.id)), inflector.singularize(modelname));
		this.body = res;
		yield next;
	});
	pOrp(routers, options.post).post("/", function* REST_POST(next) {
		let res = {};
		res[inflector.singularize(modelname)] = yield this.model.create(this.request.body[inflector.singularize(modelname)]);
		this.body = res;
		yield next;
	});
	pOrp(routers, options.put).put(`/:id`, function* REST_PUT(next) {
		let body = this.request.body[inflector.singularize(modelname)];
		let record = yield this.model.findById(this.params.id);
		for (const prop in body) {
			if (record[prop] !== undefined) {
				record[prop] = body[prop];
			}
		}
		record.save();
		this.body = {};
		this.body[inflector.singularize(modelname)] = record;
		yield next;
	});
	pOrp(routers, options.delete).del(`/:id`, function* REST_DELETE(next) {
		yield this.model.destroyById(this.params.id);
		this.body = {
			id: this.params.id
		};
		yield next;
	});
	subdomainRouters.www.public.use(path.join("/", mount_route), routers.public.routes());
	subdomainRouters.www.secured.use(path.join("/", mount_route), routers.private.routes());
}

function* allowmethods(next) {
	yield next;
	this.response.set('Access-Control-Allow-Methods', 'OPTIONS,' + this.request.get('Access-Control-Request-Method'));
	this.status = 200;
	this.response.remove('ETag');
	this.response.remove('Content-Type');
	this.response.remove('Date');
}

function initialize() {
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

	let routes = glob("koaton_modules/**/routes/*.js").concat(glob('routes/**/*.js'));
	let controllers = glob("koaton_modules/**/controllers/*.js").concat(glob('controllers/**/*.js'));
	let embers = glob("koaton_modules/**/config/ember.js").concat('config/ember.js');

	//Loads all the controllers
	for (const controllerPath of controllers) {
		let controller = require(ProyPath(controllerPath));
		controller = Object.assign({
			Name: path.basename(controllerPath).replace(".js", ""),
			Namespace: "",
			REST: false,
			Pluralize: true
		}, controller);
		if (controller.REST) {
			if (controller.Pluralize) {
				controller.Name = inflector.pluralize(controller.Name);
			}
			let mount_route = path.join("/", controller.Namespace, controller.Name, "/");
			makeRestModel(controller.REST, mount_route, controller.Name);
		}
	}

	//Load all routes
	for (const routepath of routes) {
		let route = routepath.replace(".js", ""),
		    domainrouter = subdomainRouters.www;
		if (route.indexOf(".") > -1) {
			let subdomain = route.split(".")[0];
			if (subdomainRouters[subdomain] !== undefined) {
				domainrouter = subdomainRouters[subdomain];
			}
		}
		require(ProyPath(routepath))(domainrouter, passport);
	}

	const serveapp = function (directory) {
		return function* serve_ember_app(next) {
			yield next;
			if (!this.body) {
				yield this.render(directory);
			}
		};
	};
	//Load all ember apps
	for (const ember of embers) {
		const config = require(ProyPath(ember));
		for (const app in config) {
			let emberapp = config[app];

			if (ember.indexOf("koaton_modules") > -1) {
				emberapp.directory = path.join("..", "..", "koaton_modules", app, "views", "ember_apps", config[app].directory);
			} else {
				emberapp.directory = path.join("ember_apps", config[app].directory);
			}

			const sub = emberapp.subdomain || "www",
			      approouter = new Router(),
			      serveemberapp = serveapp(emberapp.directory);

			approouter.get("/", serveemberapp).get("*", serveemberapp);
			(emberapp.access === "public" ? subdomainRouters[sub].public : subdomainRouters[sub].secured).use(path.join("/", emberapp.mount), approouter.routes());
		}
	}

	//Prepares all routers
	for (const idx in subdomainRouters) {
		subdomainRouters[idx].public = subdomainRouters[idx].public.middleware();
		subdomainRouters[idx].secured = subdomainRouters[idx].secured.middleware();
	}

	return allowmethods;
}
function routers(domain) {
	return subdomainRouters[domain];
}
exports.initialize = initialize;
exports.restify = restify;
exports.routers = routers;

//koaton_app.use(router.allowedMethods());