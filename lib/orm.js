"use strict";
const Promise = require('bluebird');
const caminte = require(process.cwd() + '/node_modules/caminte');
const fs = require('fs');
const promesifythem = ['exists', 'create', 'findOrCreate', 'findOne', 'findById', 'find', 'all', 'run', 'updateOrCreate', 'upsert', 'update', 'remove', 'destroyById', 'destroy', 'destroyAll'];
const connection = require(process.cwd() + '/config/connections')[require(process.cwd() + '/config/models').connection];
let schema = new caminte.Schema(connection.driver, connection);
let databases = {};
const addmodel = function(model_name, definition) {
	definition = definition(schema);
	definition.model.Created = { type: schema.Date };
	definition.model.Updated = { type: schema.Date };
	let model = schema.define(model_name, definition.model, definition.config || {});
	model.rawAPI = {};
	databases[model_name] = {};
	promesifythem.forEach(function(fn) {
		if (model[fn]) {
			model.rawAPI[fn] = model[fn];
			model[fn] = Promise.promisify(model[fn], {
				context: model
			});
			const magic = model[fn].bind(model);
			switch (fn) {
				case "create":
					{
						model[fn] = function(data) {
							data.Created = Date.now();
							data.Updated = data.Created;
							return magic(data);
						};
						break;
					}
				case "update":
					{
						model[fn] = function(data) {
							data.Updated = Date.now();
							return magic(data);
						}
						break;
					}
				default:
					{
						break;
					}
			}
		}
	});
	databases[model_name] = model;
}
module.exports.addModel = addmodel;
module.exports.initialize = function(app) {
	schema.on('error', (err) => {
		console.log(err.stack);
	})
	fs.readdirSync(`${process.cwd()}/models/`).forEach(function(file) {
		file = file.replace(".js", "");
		addmodel(
			app.inflect.pluralize(file),
			require(`${process.cwd()}/models/${file}`)
		);
	});
	module.exports.orm = databases;
	module.exports.middleware = databases;
	return function* orm(next) {
		this.db = databases;
		yield next;
	};
}
