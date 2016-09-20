"use strict";
const Promise = require('bluebird');
const caminte = require(process.cwd() + '/node_modules/caminte');
const fs = require('fs');
const promesifythem = ['exists', 'create', 'findOrCreate', 'findOne', 'findById', 'find', 'all', 'run', 'updateOrCreate', 'upsert', 'update', 'remove', 'destroyById', 'destroy', 'count'
	//, 'destroyAll'
];
const connection = require(process.cwd() + '/config/connections')[require(process.cwd() + '/config/models').connection];
let schema = new caminte.Schema(connection.driver, connection);
const co = require("co");
schema.Integer = schema.Number;
let databases = {};
let relations = {};

function belongsTo(dest) {
	dest = dest.split(".");
	let parent = dest[0];
	let key = dest[1];
	relations[this].push({
		Children: parent,
		key: key,
		Rel: "belongsTo",
		As: ""
	});
	return relations[this].length - 1;
}

function hasMany(dest) {
	dest = dest.split(".");
	let key = dest[1];
	relations[this].push({
		//parent:this,
		Children: dest[0],
		key: key,
		Rel: "hasMany",
		As: ""
	});
	return relations[this].length - 1;
}
const dt = require(BinPath("adapter")).datatypes;
const addmodel = function(model_name, definition) {
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
	databases[model_name] = {};
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
						return new Promise(function (resolve, reject) {
							model.rawAPI[fn]((err,count)=>{
								if(err){
									reject(err);
								}else{
									resolve(count);
								}
							},query);
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
		model.rawWhere =function rawWhere(stringquery,opts){
			let that = this;
			return new Promise(function(resolve,reject){
				let where = that.$where(stringquery);
				for(let prop in opts){
					if(where[prop]){
						where = where[prop](opts[prop]);
					}
				}
				where.exec((err,result)=>{
					if(err){
						reject(err);
					}else{
						resolve(result.map((r)=>{
							let rr={};
							for(let p in r.toObject()){
								if(p==="_id"){
									rr.id = r._id
								}else if(p!=="__v"){
									rr[p]=r[p];
								}
							}
							return rr;
						}));
					}
				});
			});
		}.bind(model.adapter);
		model.rawCount =function rawCount(stringquery){
			let that = this;
			return new Promise(function(resolve,reject){
				that.$where(stringquery).count((err,result)=>{
					if(err){
						reject(err);
					}else{
						resolve(result);
					}
				});
			});
		}.bind(model.adapter);
		model.findcre = Promise.promisify(function(query, data, cb) {
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
	databases[model_name] = model;

}
module.exports.addModel = addmodel;
module.exports.initialize = function(app, seed) {
	let res = null;
	schema.on('error', (err) => {
		console.log(err.stack);
	})
	Object.keys(dt).forEach((key) => {
		key = app.inflect.titleize(key);
		if (schema[key] === undefined) {
			schema[key] = schema[dt[key].caminte];
		}
	});
	readDir(`${process.cwd()}/models/`).forEach(function(file) {
		file = file.replace(".js", "");
		addmodel(
			app.inflect.pluralize(file),
			require(`${process.cwd()}/models/${file}`)
		);
	});

	const makerelation = function(model, relation) {
		let options = {
			as: relation.As,
			foreignKey: relation.key
		};

		let target = databases[app.inflect.pluralize(relation.Children)];
		// console.log(model,relation.Rel,target,options);
		databases[model][relation.Rel](target, options);
	}
	for (let model in relations) {
		relations[model].forEach(makerelation.bind(null, model));
	}
	const welcome = require('./welcome');
	if (process.env.NODE_ENV === "development") {
		res = co(function*() {
			let files = readDir(`${process.cwd()}/seeds/`);
			for (let index in files) {
				let file = files[index].replace(".js", "");
				// let Model = databases[app.inflect.pluralize(file.toLowerCase())];
				try {
					/*let records = yield Model.find({});
					for (let index in records) {
						yield Model.destroyById(records[index].id);
					}*/
					console.log("Sedding " + file);
					let model = databases[app.inflect.pluralize(file.toLowerCase())];
					yield require(`${process.cwd()}/seeds/${file}`)(model.findcre);
				} catch (err) {
					console.log(err.message);
					console.log(err.stack);
				}
			}
			welcome.line2(true);
		});
	}
	module.exports.orm = databases;
	module.exports.middleware = databases;
	if (seed) {
		return res;
	} else {
		return function* orm(next) {
			this.db = databases;
			yield next;
		};
	}
}
