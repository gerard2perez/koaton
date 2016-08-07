"use strict";
//https://github.com/alexmingoia/koa-router
let Router = require(process.cwd() + '/node_modules/koa-router');
let fs = require('graceful-fs');
const path = require('upath');
const passport = require('koa-passport');

function* findmodel(next) {
	let pmodel = this.request.url.split('?')[0].split('/');
	pmodel.forEach((partialpath) => {
		if (this.model === undefined && this.db) {
			this.model = this.db[partialpath];
		}
	});
	yield next;
}
module.exports = function(app) {
	let router = Router();
	let secured = Router();
	const routes = path.join(process.cwd(), "routes");
	require(routes);
	const routers = {
		public: router,
		protected: secured
	};
	//Makes the secure router to check for passport login
	secured.use(function*(next) {
		if (this.isAuthenticated()) {
			yield next;
		} else {
			this.response.status = 401;
		}
	});

	//Makes the model avaliable in the roters
	router.use(findmodel);
	secured.use(findmodel);
	let controllersDir = path.join(process.cwd(), "controllers");
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
			secured.get(`${mount_route}`, function*() {
					let res = {};
					let where = {};
					let filterset = {};
					if (this.query.page) {
						res.meta = {
							total: yield this.model.count({})
						};
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
					let mongoose = {
						$or: [{
							$and: []
						}]
					};
					let $or = mongoose.$or;
					let $and = mongoose.$or[0].$and;
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
						where = {};
						for (let item in this.query) {
							let search = {};
							search[item] = new RegExp(`.*${this.query[item]}.*`);
							$and.push(search);
						}
					}
					makerelationquery(filterset);
					res[controller.Name] = yield this.model.mongooseFilter(mongoose);
					this.body = res;
				}).get(`${mount_route}:id`, function*() {
					let response = {};
					response[controller.Name] = yield this.model.findOne({
						id: this.params.id
					});
					this.body = response;
				}).post(`${mount_route}`, function*() {
					let response = {};
					response[controller.Name] = yield this.model.create(this.request.body[app.inflect.singularize(controller.Name)]);
					this.body = response;
				})
				.put(`${mount_route}:id`, function*() {
					//let res = {};
					let res = yield this.model.upsert({
							id: this.params.id
						},
						this.request.body[app.inflect.singularize(controller.Name)]);
					this.body = {};
					// this.body=res;//[controller.Name]=this.request.body[app.inflect.singularize(controller.Name)];
				})
				.del(`${mount_route}:id`, function*() {
					yield this.model.remove({
						id: this.params.id
					});
					this.body = {
						id: this.params.id
					};
				});
		}
	});

	fs.readdirSync(path.join(process.cwd(), "routes")).forEach(function(file) {
		file = file.replace(".js", "");
		require(path.join(process.cwd(), "routes", file))(routers, passport);
	});

	let apps = require(path.join(process.cwd(), "config", "ember"));
	Object.keys(apps).forEach((app) => {

		const serveapp = function*() {
			this.layout = null;
			yield this.render(`/ember_apps/${apps[app].directory}/index`);
		};

		(apps[app].access === "public" ? router : secured)
		.get(path.join("/", apps[app].mount), serveapp)
		.get(path.join("/", apps[app].mount, "*"),serveapp );
	});

	return {
		public: router.middleware(),
		protected: secured.middleware()
	};
};
