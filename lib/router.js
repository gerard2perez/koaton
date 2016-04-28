"use strict";
//https://github.com/alexmingoia/koa-router
let Router = require(process.cwd() + '/node_modules/koa-router');
let fs = require('fs');
const path = require('path');
module.exports = function (app) {
	let router = Router();
	let controllersDir = process.cwd() + "/controllers/";
	app.use(function* (next) {
		this.model = this.db[path.basename(this.request.url)];
		yield next;
	});
	fs.readdirSync(controllersDir).forEach(function (file) {
		file = file.replace(".js", "");
		let controller = require(controllersDir + file);
		controller.Name = controller.Name || file;
		if (controller.REST !== false) {
			if (controller.Pluralize !== false) {
				controller.Name = app.inflect.pluralize(controller.Name);
			}
			router.get(`/${controller.Name}/`, function* (next) {
					this.body = yield this.model.find();
					yield next;
				}).get(`/${controller.Name}/:id`, function* (next) {
					this.body = yield this.model.findOne({
						id: this.params.id
					});
					yield next;
				}).post(`/${controller.Name}/`, function* (next) {
					yield next;
				})
				.put(`/${controller.Name}/:id`, function* (next) {
					yield next;
				})
				.del(`/${controller.Name}/:id`, function* (next) {
					yield this.model.destroy({
						id: this.params.id
					});
					this.body = {
						id: this.params.id
					};
					yield next;
				});
		} else {

		}
	});
	require(process.cwd() + "/config/routes")(router);
	return router.middleware();
};