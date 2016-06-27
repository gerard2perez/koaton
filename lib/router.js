"use strict";
//https://github.com/alexmingoia/koa-router
let Router = require(process.cwd() + '/node_modules/koa-router');
let fs = require('graceful-fs');
const path = require('upath');

function* findmodel(next) {
	let pmodel = this.request.url.split('?')[0].split('/');
	pmodel.forEach((partialpath) => {
		if (this.model === undefined) {
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
		public:router,
		protected:secured
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
			let mount_route = path.join("/", controller.Namespace, controller.Name,"/");
			secured.get(`${mount_route}`, function*() {
					let res = {};
					let where={};
					if(this.query.page){
						res.meta={total:yield this.model.count({})};
						delete this.query.page;
					}
					if(this.query){
						where.where={};
						for(let item in this.query){
							where.where[item]= new RegExp(`.*${this.query[item]}.*`);
							// where.where[item]= this.query[item];
						}
					}
					res[controller.Name] = yield this.model.find(where);
					this.body = res;
				}).get(`${mount_route}:id`, function*() {
					let response={};
					response[controller.Name]=yield this.model.findOne({
						id: this.params.id
					});
					this.body = response;
				}).post(`${mount_route}`, function*() {
					let response={};
					response[controller.Name]=yield this.model.create(this.request.body[app.inflect.singularize(controller.Name)]);
					this.body = response;
				})
				.put(`${mount_route}:id`, function*() {
					//let res = {};
					let res = yield this.model.upsert(
						{id:this.params.id},
						this.request.body[app.inflect.singularize(controller.Name)]);
						console.log(res);
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
		require(path.join(process.cwd(), "routes", file))(routers);
	});

	let apps = require(path.join(process.cwd(), "config", "ember"));
	Object.keys(apps).forEach((app) => {
		(apps[app].access === "public" ? router : secured)
		.get(path.join("/", apps[app].mount, "*"), function*() {
			this.layout = null;
			yield this.render(`/ember_apps/${apps[app].physicalPat}/index`);
		});
		if(process.env.NODE_ENV==="development"){
			(apps[app].access === "public" ? router : secured)
			.get(path.join("/", apps[app].mount, "*"), function*(next) {
				yield next;
				this.body+='<script src="http://localhost:62627/livereload.js?snipver=1"></script>';
			});
		}

	});

	return {public:router.middleware(),protected:secured.middleware()};
};
