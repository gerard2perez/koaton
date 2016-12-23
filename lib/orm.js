'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.addModel = addModel;
exports.initialize = initialize;

const fs = require('fs-extra');

const co = require('co');

const path = require('upath');

const glob = require('glob').sync;

const caminte = require('caminte');

const line2 = require('./support/consoleLines').line2;

const inflector = require('./support/inflector').default;

const exendModel = require('./support/extend_caminte').default;

// TODO: Create your own ORM, caminte worked but is not enough, remember LORM?


const connection = require(ProyPath('config', 'connections'))[require(ProyPath('config', 'models')).connection];

let schema = new caminte.Schema(connection.driver, connection);

schema.Integer = schema.Number;
schema.Email = schema.Text;
schema.Password = schema.Text;
const exp = {
	databases: {}
};
let relations = {};
function* exposeORM(next) {
	this.db = exp.databases;
	yield next;
}

function belongsTo(dest) {
	let [parent, key] = dest.split('.');
	relations[this].push({
		Children: parent,
		key: key,
		Rel: 'belongsTo',
		As: ''
	});
	return relations[this].length - 1;
}

function hasMany(dest) {
	let [children, key] = dest.split('.');
	relations[this].push({
		// parent:this,
		Children: children,
		key: key,
		Rel: 'hasMany',
		As: ''
	});
	return relations[this].length - 1;
}
let models = exports.models = exp.databases;
function addModel(...args) {
	let [modelName, definition] = args;
	relations[modelName] = [];
	const rel = {
		belongsTo: belongsTo.bind(modelName),
		hasMany: hasMany.bind(modelName)
	};
	definition = definition(schema, rel);
	for (let prop in definition.relations) {
		relations[modelName][definition.relations[prop]].As = prop;
	}
	definition.model.created = {
		type: schema.Date
	};
	definition.model.updated = {
		type: schema.Date
	};
	let model = schema.define(modelName, definition.model, definition.extra || {});
	model.rawAPI = {};
	exp.databases[modelName] = exendModel(model);
}
function initialize(seed) {
	let res = null;
	schema.on('error', err => {
		console.log(err.stack);
	});
	const models = glob('koaton_modules/**/models/*.js').concat(glob('models/*.js'));
	for (const model of models) {
		let file = path.basename(model).replace('.js', '');
		addModel(inflector.pluralize(file), require(ProyPath(model)));
	}

	const makerelation = function (model, relation) {
		let options = {
			as: relation.As,
			foreignKey: relation.key
		};

		let target = exp.databases[inflector.pluralize(relation.Children)];
		// console.log(model,relation.Rel,target,options);
		exp.databases[model][relation.Rel](target, options);
	};
	for (let model in relations) {
		relations[model].forEach(makerelation.bind(null, model));
	}
	if (process.env.NODE_ENV === 'development') {
		res = co(function* () {
			let files = fs.readdirSync(ProyPath('seeds'));
			for (let index in files) {
				let file = files[index].replace('.js', '');
				try {
					console.log('Sedding ' + file);
					let model = exp.databases[inflector.pluralize(file.toLowerCase())];
					yield require(ProyPath('seeds', file))(model.findcre);
				} catch (err) {
					console.log(err.message);
					console.log(err.stack);
				}
			}
			if (files.length === 0) {
				console.log('Nothing to seed');
			}
			line2(true);
		}).catch(e => console.log(e));
	}
	if (seed) {
		return res;
	} else {
		return exposeORM;
	}
}