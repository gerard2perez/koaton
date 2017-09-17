import inflector from './inflector';
import toMongooseStringQuery from './toMongooseStringQuery';
import * as Router from 'koa-router';
import * as path from 'upath';

/**
 * Gets the private or public router
 * @private
 * @param {Object} routers
 * @param {string} indetifier='private'
 * @return {KoaRouter}
 */
function pOrp (routers, identifier = 'private') {
	return routers[identifier];
}
/**
 * Convert a CaminteJS Model Instance into a plain json Object
 * I won't give a lot of detail in this function since it will be deprecated when I
 * create my own ORM
 * @param {CaminteJS} modelinstance
 * @param {Object} retations={}
 * @param {Object} MODEL={}
 */
export async function restify (modelinstance, /* istanbul ignore next */ relations = {}, /* istanbul ignore next */MODEL = {}) {
	/* istanbul ignore next */
	let model = modelinstance.toJSON ? modelinstance.toJSON() : modelinstance;
	for (const key of Object.keys(relations)) {
		const keyTo = relations[key].keyTo === 'id' ? '_id' : relations[key].keyTo;
		const child = relations[key].modelTo;
		let query = {where: {}};
		let serchvalue = modelinstance[relations[key].keyFrom];
		query.where[keyTo] = serchvalue;
		let relationContent = [];
		switch (relations[key].type) {
			case 'hasMany':
				relationContent = await child.all(query);
				break;
			case 'belongsTo':
				let obj = serchvalue ? await child.findOne(query) : {id: null};
				relationContent.push(obj);
				delete model[relations[key].keyFrom];
				break;
		}
		relationContent = relationContent.filter(record => record !== null);
		relationContent = configuration.server.database.relationsMode === 'ids' ? relationContent.map(record => record.id) : relationContent.map(record => {
			if (record.id === null) {
				return null;
			}
			record = record.toJSON();
			delete record[relations[key].keyTo];
			return record;
		});
		if (relations[key].type === 'belongsTo') {
			relationContent = relationContent[0];
		}
		Object.defineProperty(model, key, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: relationContent
		});
	}
	let manyfields = [];
	if (MODEL.prototype && MODEL.prototype.many2many) {
		manyfields = Object.keys(MODEL.prototype.many2many);
	}
	for (const related of manyfields) {
		let records = await MODEL.prototype.many2many[related](modelinstance.id);
		Object.defineProperty(model, related, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: configuration.server.database.relationsMode === 'ids' ? records.map(record => record.id) : records
		});
	}
	return model;
}
/**
 * Handles the insertion of a single model
 * I won't give a lot of detail in this function since it will be deprecated when I
 * create my own ORM
 * @param {CaminteJS} Instance
 * @param {Object} model - the information to be stored
 * @param {Object} entity=null
 * @return {Object}
 */
export async function REST_POST_SINGLE (Model, model, entity = null) {
	if (!entity) {
		entity = await Model.create(model);
	}
	let modelRelations = {};
	for (const relation of Object.keys(Model.relations)) {
		const relations = model[relation];
		if (relations) {
			let child = Model.relations[relation].modelTo;
			let foreignKey;
			let foreignValue;
			switch (Model.relations[relation].type) {
				case 'hasMany':
					foreignKey = Model.relations[relation].keyTo;
					foreignValue = entity[Model.relations[relation].keyFrom];
					modelRelations[relation] = [];
					for (const related of relations) {
						if (typeof related === 'object') {
							related[foreignKey] = foreignValue;
							modelRelations[relation].push((await child.create(related)).id);
						} else {
							let data = {};
							data[foreignKey] = foreignValue;
							let { affected: { nModified } } = await child.update({
								_id: related
							}, data);
							/* istanbul ignore else */
							if (nModified) {
								modelRelations[relation].push(related);
							}
						}
					}
					break;
				case 'belongsTo':
					foreignKey = Model.relations[relation].keyFrom;
					let related;
					if (typeof relations === 'object') {
						related = await child.create(relations);
					} else {
						related = await child.findById(relations);
					}
					foreignValue = related[Model.relations[relation].keyTo];
					let { affected: { nModified } } = await Model.update({
						_id: entity.id
					}, {[foreignKey]: foreignValue});
					/* istanbul ignore else */
					if (nModified) {
						modelRelations[relation] = related.id;
					}
					break;
			}
		}
	}
	/* istanbul ignore else */
	if (entity.many2many) {
		for (const related of Object.keys(entity.many2many)) {
			modelRelations[related] = modelRelations[related] || [];
			/* istanbul ignore else */
			if (model[related]) {
				for (const id of model[related]) {
					let res = await entity.many2many[related](entity.id, id);
					/* istanbul ignore else */
					if (res.id) {
						modelRelations[related].push(id);
					}
				}
			}
		}
	}
	return Object.assign({}, entity.toJSON(), modelRelations);
}
/**
 * Creates the REST routes
 * I won't give a lot of detail in this function since it will be deprecated when I
 * create my own ORM
 * @param {options} Instance
 * @param {route} route - base route to mount everyting
 * @param {String} modelname - Name of the model associated with the routes
 * @param {KoaRouter[]} - return a plubic and a private router for the rest routes
 */
export function RestModel (options, route, modelname) {
	let routers = {
		public: new Router(),
		private: new Router()
	};
	let mountRoute = route.replace(/\/$/, '');
	pOrp(routers, options.get).get('/', async function REST_GET (ctx, next) {
		let res = {},
			filteroptions = { skip: 0 };
		filteroptions.limit = isNaN(ctx.query.size) ? isNaN(configuration.server.pagination.limit) ? /* istanbul ignore next */50 : configuration.server.pagination.limit : parseInt(ctx.query.size, 10);
		if (ctx.query.size) {
			delete ctx.query.size;
		}
		if (ctx.query.page) {
			filteroptions.skip = (ctx.query.page * 1 - 1) * filteroptions.limit;
			delete ctx.query.page;
		}
		let rawmodels;
		let total;
		let usemongoose = false;
		for (const key of Object.keys(ctx.query)) {
			if (key.indexOf('.') > -1) {
				usemongoose = true;
				break;
			}
		}
		if (ctx.query.filterset || usemongoose) {
			let filterset = await toMongooseStringQuery(ctx.query, ctx.model, ctx.db);
			rawmodels = await ctx.model.rawWhere(filterset, filteroptions);
			total = await ctx.model.rawCount(filterset);
		} else {
			let finalq = Object.assign({}, {where: ctx.query}, filteroptions);
			rawmodels = await ctx.model.find(finalq);
			total = await ctx.model.count(ctx.query);
		}
		res.meta = {
			page: Math.floor(filteroptions.skip / filteroptions.limit) + 1,
			page_size: filteroptions.limit,
			total
		};
		if (Object.keys(ctx.model.relations).length > 0) {
			for (const idx in rawmodels) {
				rawmodels[idx] = await restify((await ctx.model.findById(rawmodels[idx].id)), ctx.model.relations, ctx.model);
			}
		}
		res[modelname] = rawmodels;
		ctx.body = res;
	});
	pOrp(routers, options.get).get('/:id', async function REST_GET_ID (ctx, next) {
		let res = {};
		res[inflector.singularize(modelname)] = await restify(await ctx.model.findById(ctx.params.id), ctx.model.relations, ctx.model);
		ctx.body = res;
	});
	pOrp(routers, options.post).post('/', async function REST_POST (ctx, next) {
		let res = {};
		let model = ctx.request.body[inflector.singularize(modelname)];
		model = model ? [model] : ctx.request.body[modelname];
		let entities = [];
		for (const entity of model) {
			let created = await REST_POST_SINGLE(ctx.model, entity);
			entities.push(created);
		}
		if (entities.length === 1) {
			res[inflector.singularize(modelname)] = entities[0];
		} else {
			res[modelname] = entities;
		}
		ctx.status = 201;
		ctx.body = res;
	});
	pOrp(routers, options.post).post('/:id/:child', async function REST_POST_ID (ctx, next) {
		let parent = await ctx.model.findById(ctx.params.id);
		if (typeof parent[ctx.params.child] !== 'function') {
			ctx.status = 402;
		} else {
			let child = ctx.model.relations[ctx.params.child];
			switch (child.type) {
				case 'hasMany':
					ctx.request.body[child.keyTo] = parent[[child.keyFrom]];
					await child.modelTo.create(ctx.request.body);
					break;
				case 'belongsTo':
					let data = ctx.request.body[ctx.params.child];
					/* istanbul ignore next */
					if (typeof data === 'object') {
						data = (await child.modelTo.create(data))._id;
					}
					parent[ctx.params.child](data);
					parent.save();
					break;
			}
		}
		let res = {};
		res[inflector.singularize(modelname)] = await restify(parent, ctx.model.relations, ctx.model);
		ctx.body = res;
	});
	pOrp(routers, options.put).put('/:id', async function REST_PUT (ctx, next) {
		let body = ctx.request.body[inflector.singularize(modelname)];
		let record = await ctx.model.findById(ctx.params.id);
		for (const prop in body) {
			if (record[prop] !== undefined) {
				record[prop] = body[prop];
			}
		}
		record.save();
		record = await REST_POST_SINGLE(ctx.model, body, record);
		ctx.body = {};
		ctx.body[inflector.singularize(modelname)] = record;
	});
	pOrp(routers, options.delete).del('/:id', async function REST_DELETE (ctx, next) {
		await ctx.model.destroyById(ctx.params.id);
		ctx.body = {
			id: ctx.params.id
		};
	});
	routers.path = path.join('/', mountRoute);
	return routers;
}
