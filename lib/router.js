"use strict";
//https://github.com/alexmingoia/koa-router
let Router = require(process.cwd() + '/node_modules/koa-router');
let fs = require('fs');
const path = require('upath');
module.exports = function (app) {
	let router = Router();
	let secured = Router();
	secured.use(function*(next){
		if(this.isAuthenticated()){
			yield next;
		}else{
			this.response.status = 401;
		}
	});
	let controllersDir = process.cwd() + "/controllers/";
	app.use(function* (next) {
		let pmodel = this.request.url.split('?')[0].split('/');
		pmodel.forEach((partialpath) => {
			if (this.model === undefined) {
				this.model = this.db[partialpath];
			}
		});
		yield next;
	});
	fs.readdirSync(controllersDir).forEach(function (file) {
		file = file.replace(".js", "");
		let controller = require(controllersDir + file);
		controller.Name = !controller.Name ? file : controller.Name;
		controller.Namespace = !controller.Namespace ? "" : controller.Namespace;
		if (controller.REST !== false) {
			if (controller.Pluralize !== false) {
				controller.Name = app.inflect.pluralize(controller.Name);
			}
			let mount_route = path.join("/", controller.Namespace, controller.Name);
			secured.get(`${mount_route}/`, function* (next) {
					let res = {};
					res[controller.Name] = yield this.model.find();
					this.body = res;
					yield next;
				}).get(`${mount_route}/:id`, function* (next) {
					this.body = yield this.model.findOne({
						id: this.params.id
					});
					yield next;
				}).post(`${mount_route}/`, function* (next) {
					this.body =yield this.model.create(this.request.body[app.inflect.singularize(controller.Name)]);
					yield next;
				})
				.put(`${mount_route}/:id`, function* (next) {
					this.body = yield this.model.create(this.request.body[app.inflect.singularize(controller.Name)]);
					yield next;
				})
				.del(`${mount_route}/:id`, function* (next) {
					yield this.model.remove({
						id: this.params.id
					});
					this.body = {
						id: this.params.id
					};
					yield next;
				});
		}
	});
	let apps = require(`${process.cwd()}/config/ember`);
	Object.keys(apps).forEach((app) => {
		secured.get(path.join("/",apps[app].mount,"*"),function*( ){
			this.layout = null;
			yield this.render(`/ember_apps/${apps[app].mount}/index.html`);
		});
	});
	require(process.cwd() + "/config/routes")(router,secured);
	return [router.middleware(),secured.middleware()];
};
