import * as Promise from 'bluebird';
import * as co from "co";
import {line2} from './support/consoleLines';

//TODO: Create your own ORM caminte worked but is not enough, remember LORM?
const caminte = require(ProyPath('node_modules', 'caminte'));
const promesifythem = ['exists', 'create', 'findOrCreate', 'findOne', 'findById', 'find', 'all', 'run', 'updateOrCreate', 'upsert', 'update', 'remove', 'destroyById', 'destroy', 'count'
	//, 'destroyAll'
];
const connection = require(ProyPath('config', 'connections'))[require(ProyPath('config', 'models')).connection];
let schema = new caminte.Schema(connection.driver, connection);
schema.Integer = schema.Number;
schema.Email = schema.Text;
const exp = {
	databases: {}
};
let relations = {};

function belongsTo(dest) {
	let [parent,key] = dest.split(".");
	relations[this].push({
		Children: parent,
		key: key,
		Rel: "belongsTo",
		As: ""
	});
	return relations[this].length - 1;
}

function hasMany(dest) {
	let [children,key] = dest.split(".");
	relations[this].push({
		//parent:this,
		Children: children,
		key: key,
		Rel: "hasMany",
		As: ""
	});
	return relations[this].length - 1;
}
export let orm = exp.databases;
export function addModel(...args) {
	let [model_name, definition]=args;
	relations[model_name] = [];
	const rel = {
		belongsTo: belongsTo.bind(model_name),
		hasMany: hasMany.bind(model_name)
	};
	definition = definition(schema, rel);
	for (let prop in definition.relations) {
		relations[model_name][definition.relations[prop]].As = prop;
	}
	definition.model.created = {
		type: schema.Date
	};
	definition.model.updated = {
		type: schema.Date
	};
	let model = schema.define(model_name, definition.model, definition.extra || {});
	model.rawAPI = {};
	exp.databases[model_name] = {};
	promesifythem.forEach(function(fn) {
		if (model[fn]) {
			model.rawAPI[fn] = model[fn].bind(model);
			model[fn] = Promise.promisify(model[fn], {
				context: model
			});
			const magic = model[fn].bind(model);
			switch (fn) {
				case "create":
					{
						model[fn] = function(data) {
							data.created = Date.now();
							data.updated = data.created;
							return magic(data);
						};
						break;
					}
				case "count":
					model[fn] = function(query) {
						return new Promise(function(resolve, reject) {
							model.rawAPI[fn]((err, count) => {
								if (err) {
									reject(err);
								} else {
									resolve(count);
								}
							}, query);
						})

					};
					break;
				case "update":
					{
						model[fn] = function(query, data) {
							data.updated = Date.now();
							return magic(query, data);
						}
						break;
					}
				default:
					{
						break;
					}
			}
		}
		model.rawWhere = function rawWhere(stringquery, opts) {
			let that = this;
			return new Promise(function(resolve, reject) {
				let where = that.$where(stringquery);
				for (let prop in opts) {
					if (where[prop]) {
						where = where[prop](opts[prop]);
					}
				}
				where.exec((err, result) => {
					if (err) {
						reject(err);
					} else {
						resolve(result.map((r) => {
							let rr = {};
							for (let p in r.toObject()) {
								if (p === "_id") {
									rr.id = r._id
								} else if (p !== "__v") {
									rr[p] = r[p];
								}
							}
							return rr;
						}));
					}
				});
			});
		}.bind(model.adapter);
		model.rawCount = function rawCount(stringquery) {
			let that = this;
			return new Promise(function(resolve, reject) {
				that.$where(stringquery).count((err, result) => {
					if (err) {
						reject(err);
					} else {
						resolve(result);
					}
				});
			});
		}.bind(model.adapter);
		model.findcre = Promise.promisify(function(...args) {
			let [query, data, cb] = args;
			if (cb === undefined) {
				cb = data;
				data = {};
			}
			let that = this;
			data = data || {};
			Object.keys(query).forEach(function(field) {
				data[field] = query[field];
			});
			that.rawAPI.findOne({
				where: query
			}, function(err, model) {
				if (model === null) {
					data.created = Date.now();
					data.updated = data.created;
					that.rawAPI.create(data, cb);
				} else {
					cb(err, model);
				}
			});
		}, {
			context: model
		});
		model.mongooseFilter = Promise.promisify(function(filter, cb) {
			// console.log(filter);
			this.rawAPI.find(filter, cb); //.exec(cb);
		}, {
			context: model
		});
	});
	exp.databases[model_name] = model;
}
export function initialize(app, seed) {
	let res = null;
	schema.on('error', (err) => {
		console.log(err.stack);
	})
	readDir(ProyPath('models')).forEach(function(...args) {
		let [file]=args;
		file = file.replace(".js", "");
		addModel(
			app.inflect.pluralize(file),
			require(ProyPath('models', file))
		);
	});

	const makerelation = function(model, relation) {
		let options = {
			as: relation.As,
			foreignKey: relation.key
		};

		let target = exp.databases[app.inflect.pluralize(relation.Children)];
		// console.log(model,relation.Rel,target,options);
		exp.databases[model][relation.Rel](target, options);
	}
	for (let model in relations) {
		relations[model].forEach(makerelation.bind(null, model));
	}
	if (process.env.NODE_ENV === "development") {
		res = co(function*() {
			let files = readDir(ProyPath('seeds'));
			for (let index in files) {
				let file = files[index].replace(".js", "");
				// let Model = exp.databases[app.inflect.pluralize(file.toLowerCase())];
				try {
					/*let records = yield Model.find({});
					for (let index in records) {
						yield Model.destroyById(records[index].id);
					}*/
					console.log("Sedding " + file);
					let model = exp.databases[app.inflect.pluralize(file.toLowerCase())];
					yield require(ProyPath('seeds', file))(model.findcre);
				} catch (err) {
					console.log(err.message);
					console.log(err.stack);
				}
			}
			if (files.length === 0) {
				console.log("Nothing to seed");
			}
			line2(true);
		});
	}
	if (seed) {
		return res;
	} else {
		return function* orm(next) {
			this.db = exp.databases;
			yield next;
		};
	}
}
