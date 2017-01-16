/** @module orm*/
import * as fs from 'fs-extra';
import * as co from 'co';
import * as path from 'upath';
import { sync as glob } from 'glob';
import * as caminte from 'caminte';
import { line2 } from './support/consoleLines';
import inflector from './support/inflector';
import exendModel from './support/extend_caminte';

// TODO: Create your own ORM, caminte worked but is not enough, remember LORM?
const connection = configuration.connections[configuration.server.database.connection];
let schema = new caminte.Schema(connection.driver, connection);

schema.Integer = schema.Number;
schema.Email = schema.Text;
schema.Password = schema.Text;
const exp = {
	databases: {}
};
let relations = {};
async function exposeORM (ctx, next) {
	ctx.db = exp.databases;
	await next();
}

function belongsTo (dest) {
	let [parent, key] = dest.split('.');
	relations[this].push({
		Children: parent,
		key: key,
		Rel: 'belongsTo',
		As: ''
	});
	return relations[this].length - 1;
}

function hasMany (dest) {
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
export let models = exp.databases;
export function addModel (...args) {
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
	let model = schema.define(modelName, definition.model, Object.assign({}, definition.extra));
	model.rawAPI = {};
	// model.relations = definition.relations;
	exp.databases[modelName] = exendModel(model);
}
export function initialize (seed) {
	let res = null;
	/* istanbul ignore next */
	schema.on('error', (err) => {
		console.log(err.stack);
	});
	const models = glob('koaton_modules/**/models/*.js').concat(glob('models/*.js'));
	for (const model of models) {
		let file = path.basename(model).replace('.js', '');
		addModel(
			inflector.pluralize(file),
			require(ProyPath(model)).default
		);
	}

	const makerelation = function (model, relation) {
		let options = {
			as: relation.As,
			foreignKey: relation.key
		};

		let target = exp.databases[inflector.pluralize(relation.Children)];
		exp.databases[model][relation.Rel](target, options);
	};
	for (let model in relations) {
		relations[model].forEach(makerelation.bind(null, model));
	}
	/* istanbul ignore else */
	if (process.env.NODE_ENV === 'development') {
		res = co(function * () {
			let files = fs.readdirSync(ProyPath('seeds'));
			for (let index in files) {
				let file = files[index].replace('.js', '');
				try {
					console.log('Sedding ' + file);
					let model = exp.databases[inflector.pluralize(file.toLowerCase())];
					yield require(ProyPath('seeds', file)).default(model.findcre);
				} catch (err) /* istanbul ignore next*/{
					console.log(err.message);
					console.log(err.stack);
				}
			}
			/* istanbul ignore next*/
			if (files.length === 0) {
				console.log('Nothing to seed');
			}
			line2(true);
		}).catch(console.log);
	}
	/* istanbul ignore if */
	if (seed) {
		return res;
	} else {
		return exposeORM;
	}
}
