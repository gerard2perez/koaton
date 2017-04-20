import inflector from './inflector';
async function prepareQuery (database, model, query, item) {
	let [modelname, property] = item.split('.');
	let prequery = {};
	let value = query instanceof Array ? query[item] : query.value;
	value = query.condition === '===' ? value : new RegExp(`.*${value}.*`);
	prequery[property] = value;
	let finds = [];
	if (property === 'id') {
		finds = [await database[inflector.pluralize(modelname)].findById(value)];
	} else {
		finds = await database[inflector.pluralize(modelname)].find({
			where: prequery
		});
	}
	let term = modelname;
	switch (model.relations[modelname].type) {
		case 'belongsTo':
			term = model.relations[modelname].keyFrom;
			break;
		/* istanbul ignore next */
		case 'hasMany':
			console.log('hasMany');
			// TODO: camintejs does not allow me to do this;
			break;
	}
	return {
		key: term,
		condition: 'some',
		value: finds.map(m => m._id)
	};
}
async function getQuery (database, model, filtergroup) {
	let group = [];
	for (let index in filtergroup) {
		let filter = filtergroup[index];
		if (filter.key.indexOf('.') > -1) {
			filter = await prepareQuery(database, model, filter, filter.key);
		}
		if (index > 0) {
			group.push(filtergroup[index - 1].link === 'or' ? '||' : '&&');
		}
		switch (filter.condition) {
			case 'like':
				group.push(`(this.${filter.key}.search(/${filter.value}/ig)>-1) `);
				break;
			case 'in':
				group.push(`(['${filter.value.join("', '", '')}'].indexOf(this.${filter.key})>-1)`);
				break;
			case 'some':
				group.push(`(['${filter.value.join("', '", '')}'].some(function(r){return r == that.${filter.key}}))`);
				break;
			case '==':
				group.push(`this.${filter.key}.search('${filter.value}')>-1`);
				break;
			case '===':
				group.push(`this.${filter.key} === '${filter.value}'`);
				break;
			default:
				group.push(`(this.${filter.key} ${filter.condition} '${filter.value}') `);
				break;
		}
	}
	return group.join(' ');
}

async function buildFilterSet (query, model, database) {
	let filterset = query.filterset || [];
	if (query.filterset) {
		delete query.filterset;
	}
	let searchgroup = {
		filters: [],
		link: null
	};
	for (let item in query) {
		if (item.indexOf('.') > -1) {
			searchgroup.filters.push(await prepareQuery(database, model, query, item));
		} else {
			searchgroup.filters.push({
				key: item,
				condition: '===',
				value: new RegExp(`.*${query[item]}.*`, 'i')
			});
		}
		if (filterset.length > 0) {
			filterset[filterset.length - 1].link = 'and';
		}
		filterset.push(searchgroup);
	}
	return filterset;
}

export default async function toMongooseStringQuery (queryBody, model, database) {
	let filterset = await buildFilterSet(queryBody, model, database);
	let query = [];
	for (let index in filterset) {
		let filtergroup = filterset[index];
		if (index > 0) {
			query.push(filterset[index - 1].link === 'or' ? '||' : '&&');
		}
		query.push(`(${await getQuery(database, model, filtergroup.filters)})`);
	}
	if (query.length > 0) {
		query.splice(0, 0, 'var that=this;return ');
	} else {
		query.push('return true');
	}
	return query.join(' ') + ';';
}
