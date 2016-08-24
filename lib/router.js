"use strict";
//https://github.com/alexmingoia/koa-router
let Router = require(process.cwd() + '/node_modules/koa-router');
let fs = require('graceful-fs');
const path = require('upath');
const passport = require('koa-passport');
const server = require(path.join(process.cwd(), "config", "server"));
const subdomains = server.subdomains || ["www"];
const Promise = require('bluebird');
function* restify(modelinstance,modelname){
	const relation = require("../models/"+modelname)({},{hasMany(field){return field.split(".")[1]},belongsTo(field){return field.split(".")[1]}}).relations;
	let model = modelinstance.toJSON();
	for(const key in relation){
		if( typeof modelinstance[key] === "function"){
			let find = Promise.promisify(modelinstance[key].find,{context:modelinstance});
			let relations =  yield find({});
			if(scfg.relations_mode){
				Object.defineProperty(model,key, {
						enumerable: true,
						configurable: true,
						writable: true,
						value: relations.map((record)=>{return record.id})
				});
			}else{
				console.log(relation);
				Object.defineProperty(model,key, {
						enumerable: true,
						configurable: true,
						writable: true,
						value: relations.map((record)=>{
							record = record.toObject();
							record[relation[key]]=modelinstance.id;
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
		this.response.status = 401;
	}
}
module.exports = function(app) {
	const routes = path.join(process.cwd(), "routes");
	app.routers = [];
	for (const idx in subdomains) {
		const subdomain = subdomains[idx];
		app.routers[subdomain] = {
			public: new Router(),
			protected: new Router()
		};
		app.routers[subdomain].protected.use(protect);
		app.routers[subdomain].public.use(findmodel);
		app.routers[subdomain].protected.use(findmodel);
	}
	let routers = app.routers.www;
	let router = app.routers.www.public;
	let secured = app.routers.www.protected;
	let controllersDir = path.join(process.cwd(), "controllers");
	const getrouter = function(spec) {
		spec = spec || "private";
		if (spec === "public") {
			return router;
		} else {
			return secured;
		}
	}

	function* allowmethods(next) {
		yield * next;
		this.response.set('Access-Control-Allow-Methods', 'OPTIONS,' + this.request.get('Access-Control-Request-Method'));
		this.status = 200;
		yield next;
		this.response.remove('ETag');
		this.response.remove('Content-Type');
		this.response.remove('Date');
	}
	fs.readdirSync(controllersDir).forEach(function(file) {
		file = file.replace(".js", "");
		let controller = require(path.join(controllersDir, file));
		controller.Name = !controller.Name ? file : controller.Name;
		controller.Namespace = !controller.Namespace ? "" : controller.Namespace;
		if (controller.REST !== false) {
			if (controller.Pluralize !== false) {
				controller.Name = app.inflect.pluralize(controller.Name);
			}
			let mount_route = path.join("/", controller.Namespace, controller.Name, "/");
			router.options(path.join(mount_route), allowmethods).options(path.join(mount_route, "*"), allowmethods);
			getrouter(controller.REST.get).get(`${mount_route}`, function*() {
				let limit, skip,
					res = {},
					where = {},
					filterset = {},
					mongoose = {
						$or: [{
							$and: []
						}]
					};
				if (this.query.size) {
					limit = parseInt(this.query.size,100);
					delete this.query.size;
				}
				if (this.query.page) {
					limit = limit ?  limit:server.pagination.limit;
					limit = limit ? limit:50;
					skip = ((this.query.page*1) - 1) * limit;
					delete this.query.page;
				}

				if (this.query.filterset) {
					filterset = this.query.filterset;
					delete this.query.filterset;
				}
				const toMongoose = function(filter) {
					let key = filter.key;
					let cd = filter.condition;
					let val = filter.value;
					let query = {};
					query[key] = {};
					switch (cd) {
						case "==":
							query[key].$eq = val;
							break;
						case ">=":
							query[key].$gte = val;
							break;
						case "<=":
							query[key].$lte = val;
							break;
						case ">":
							query[key].$gt = val;
							break;
						case "<":
							query[key].$lt = val;
							break;
						case "!=":
							query[key].$ne = val;
							break;
						case "like":
							query[key].$regex = new RegExp(".*val.*", "i");
							break;
						default:
							query = null;
							break;
					}
					return query;
				}
				const processfiltergorup = function(query, filters) {
					let $query = {
						$or: [{
							$and: []
						}]
					};
					let $or = $query.$or;
					let $and = $query.$or[0].$and;
					for (const index in filters) {
						const filter = filters[index];
						if (filter.link === "or") {
							$or.push(toMongoose(filter));
						} else {
							$and.push(toMongoose(filter));
						}
					}
					if ($and.length === 1) {
						$or.push($and[0]);
						$and.splice(0, 1);
					}
					if ($and.length === 0) {
						$or.splice(0, 1);
					}
					if ($or.length >= 2) {
						query.push($query);
					} else if ($or.length === 1) {
						query.push($or[0]);
					}
				}

				let $or = mongoose.$or,$and = mongoose.$or[0].$and;
				const makerelationquery = function(filterset) {
					for (const index in filterset) {
						const filtergroup = filterset[index];
						if (filtergroup.link === "and") {
							processfiltergorup($and, filtergroup.filters);
						} else if (filtergroup.link === "or") {
							processfiltergorup($or, filtergroup.filters);
						} else {
							if (index - 1 > -1) {
								if (filterset[index - 1].link === "and") {
									processfiltergorup($and, filtergroup.filters);
								} else if (filterset[index - 1].link === "or") {
									processfiltergorup($or, filtergroup.filters);
								}
							} else {
								processfiltergorup($and, filtergroup.filters);
							}
						}
					}
					if ($or.length === 1) {
						mongoose = {
							$and: $and
						};
					}
					if (mongoose.$and && mongoose.$and.length === 0) {
						mongoose = {};
					}
				}
				if (this.query) {
					where = [];
					for (let item in this.query) {
						let search = {};
						search[item] = new RegExp(`.*${this.query[item]}.*`);
						where.push(search);
					}
				}
				makerelationquery(filterset);
				if (limit) {
					mongoose.limit = limit;
				}
				if (skip>=0) {
					res.meta = {
						total: yield this.model.count({})
					};
					mongoose.skip = skip;
				}
				if($and.length===0 && where.length>0){
					mongoose.where = {}
					for(const idx in where){
						for(const prop in where[idx]){
							mongoose.where[prop]=where[idx][prop];
						}

					}
				}
				res[controller.Name] = yield this.model.mongooseFilter(mongoose);
				this.body = res;
			})
			.get(`${mount_route}:id`, function*() {
				let response = {};
				response[controller.Name] = yield restify(yield this.model.findById(this.params.id));
				this.body = response;
			});
			getrouter(controller.REST.post).post(`${mount_route}`, function*() {
				let response = {};
				response[controller.Name] = yield this.model.create(this.request.body[app.inflect.singularize(controller.Name)]);
				this.body = response;
			});
			getrouter(controller.REST.put).put(`${mount_route}:id`, function*() {
				let body = this.request.body[app.inflect.singularize(controller.Name)];
				let record = yield this.model.findById(this.params.id);
				for(const prop in body){
					if(record[prop]!==undefined){
						record[prop]=body[prop];
					}
				}
				record.save();
				this.body={};
				this.body[app.inflect.singularize(controller.Name)] = record;
			});
			getrouter(controller.REST.delete).del(`${mount_route}:id`, function*() {
				yield this.model.destroyById(this.params.id);
				this.body = {
					id: this.params.id
				};
			});
		}
	});
	fs.readdirSync(routes).forEach(function(file) {
		let domainrouter = routers;
		file = file.replace(".js", "");
		if (file.indexOf(".")) {
			let subdomain = file.split(".")[0];
			if (app.routers[subdomain] !== undefined) {
				domainrouter = app.routers[subdomain];
			}
		}
		require(path.join(process.cwd(), "routes", file))(domainrouter, passport);
	});
	let apps = require(path.join(process.cwd(), "config", "ember"));
	Object.keys(apps).forEach((emberapp) => {
		const serveapp = function*() {
			this.layout = null;
			yield this.render(`/ember_apps/${apps[emberapp].directory}/index`);
		};
		const sub = apps[emberapp].subdomain || "www";
		(apps[emberapp].access === "public" ? app.routers[sub].public : app.routers[sub].protected)
		.get(path.join("/", apps[emberapp].mount), serveapp)
			.get(path.join("/", apps[emberapp].mount, "*"), serveapp);
	});
	for (const subdomain in app.routers) {
		app.routers[subdomain] = {
			public: app.routers[subdomain].public.middleware(),
			protected: app.routers[subdomain].protected.middleware()
		};
	}
	//app.use(router.allowedMethods());
	return {
		public: app.routers.www.public,
		protected: app.routers.www.protected
	};
};
