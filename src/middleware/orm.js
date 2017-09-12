import * as fs from 'fs';
import * as path from 'upath';
import { sync as glob } from 'glob';
import * as caminte from 'caminte';
import { line2 } from '../support/consoleLines';
import inflector from '../support/inflector';
import exendModel from '../support/extend_caminte';
import debug from '../support/debug';

// TODO: Create your own ORM, caminte worked but is not enough, remember LORM?
/** @ignore */
const connection = configuration.connections[configuration.server.database.connection],
	exp = { databases: {} };
/** @ignore */
let schema = new caminte.Schema(connection.driver, connection),
	relations = {};

schema.Integer = schema.Number;
schema.Email = schema.Text;
schema.Password = schema.Text;

/**
 * This middleware decodes the query param filterset which is expected in a jsurl format
 * and appends jsurl to ctx.state
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 * @param {JSURL} ctx.state.db - reference attached.
 * @param {JSURL} ctx.db - old reference attached this is now DEPRECATED.
 */
export async function ormMiddleware (ctx, next) {
	ctx.db = exp.databases;
	ctx.state.db = exp.databases;
	await next();
}
/** @ignore */
function relation (mode, dest) {
	let [parent, key] = dest.split('.');
	relations[this].push({
		Children: parent,
		key: key,
		Rel: mode,
		As: ''
	});
	return relations[this].length - 1;
}
/**
 * This function extends the CaminteJS relations, adding Many to Many support
 */
function makerelation (model, relation) {
	let options = {
		as: relation.As,
		foreignKey: relation.key
	};
	let target = exp.databases[inflector.pluralize(relation.Children)];
	if (relation.Rel !== 'manyToMany') {
		exp.databases[model][relation.Rel](target, options);
	} else {
		exp.databases[model].prototype.many2many = exp.databases[model].prototype.many2many || {};
		exp.databases[model].prototype.many2many[relation.Parent] = function (id, id2) {
			if (id && id2) {
				return exp.databases[relation.Children].findcre({
					[`${model}ID`]: id,
					[`${relation.Parent}ID`]: id2
				});
			}
			return exp.databases[relation.Children].find({
				where: {
					[`${model}ID`]: id
				}
			}).then(records => {
				let all = [];
				for (const record of records) {
					all.push(exp.databases[relation.Parent].findById(record[`${relation.Parent}ID`]));
				}
				return Promise.all(all);
			});
		};
	}
}
/**
* Make avaliable all the model definitions for various propurses
* @private
*/
export let models = exp.databases;
/**
 * This function allow to insert models to the database definition only during
 * system setup should not be use while returning a requeset and only used during
 * setup
 * @param {string} modelName The name of the new model
 * @param {KoatonModelv1} definition a version 1 model (based on CaminteJS)
 */
export function addModel (modelName, definition) {
	relations[modelName] = [];
	const rel = {
		belongsTo: relation.bind(modelName, 'belongsTo'),
		hasMany: relation.bind(modelName, 'hasMany'),
		manyToMany (configuration) {
			let targetModel = inflector.pluralize(configuration.targetModel);
			let intermediateTable = `${modelName}_${targetModel}`;
			let key1 = `${modelName}ID`;
			let key2 = `${targetModel}ID`;
			let Model = {
				[key1]: {
					type: schema.String
				},
				[key2]: {
					type: schema.String
				}
			};
			let Extra = {
				indexes: {
					idx_1: {
						columns: `${key1}, ${key2}`
					}
				}
			};
			let MODEL = schema.define(intermediateTable, Model, Extra);
			MODEL.rawAPI = {};
			exp.databases[intermediateTable] = exendModel(MODEL);
			relations[modelName].push({
				Children: intermediateTable,
				Rel: 'manyToMany',
				Parent: targetModel
			});
			relations[targetModel] = relations[targetModel] || /* istanbul ignore next */[];
			relations[targetModel].push({
				Parent: modelName,
				Rel: 'manyToMany',
				Children: intermediateTable
			});
			return relations[modelName].length - 1;
		}
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
	exp.databases[modelName] = exendModel(model);
}
/**
 * Initialize the database registering all te model to the CaminteJS ORM
 * and seeds all the models
 * @param {boolean} [seed=false] if true reads the files in seed to populate database on start
 * @return {boolean} Tells if the seed process was correctly executed
 */
export function initializeORM (seed) {
	let res = null;
	/* istanbul ignore next */
	schema.on('error', (err) => {
		debug(err.stack);
	});
	const models = glob('koaton_modules/**/models/*.js').concat(glob('models/*.js'));
	for (const model of models) {
		let file = path.basename(model).replace('.js', '');
		addModel(
			inflector.pluralize(file),
			require(ProyPath(model)).default
		);
	}
	for (let model in relations) {
		relations[model].forEach(makerelation.bind(null, model));
	}
	/* istanbul ignore else */
	if (process.env.NODE_ENV === 'development') {
		res = (async function () {
			let files = fs.readdirSync(ProyPath('seeds'));
			for (let index in files) {
				let file = files[index].replace('.js', '');
				try {
					debug(`Sedding ${file}`);
					let model = exp.databases[inflector.pluralize(file.toLowerCase())];
					await require(ProyPath('seeds', file)).default(model.findcre);
				} catch (err) /* istanbul ignore next */ {
					debug(err);
				}
			}
			/* istanbul ignore next */
			if (files.length === 0) {
				debug('Nothing to seed');
			}
			line2(true);
		})();
	}
	/* istanbul ignore if */
	return res;
}
