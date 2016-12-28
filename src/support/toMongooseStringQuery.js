import inflector from './inflector';

function getQuery (filtergroup) {
	let group = [];
	for (let index in filtergroup) {
		let filter = filtergroup[index];
		if (index > 0) {
			group.push(filtergroup[index - 1].link === 'or' ? '||' : '&&');
		}
		switch (filter.condition) {
			case 'like':
				group.push(`(this.${filter.key}.search(/${filter.value}/ig)>-1) `);
				break;
			case 'in':
				group.push(`(['${filter.value.join('', '')}'].indexOf(this.${filter.key})>-1)`);
				break;
			case 'some':
				group.push(`(['${filter.value.join('', '')}'].some(function(r){return r == that.${filter.key}}))`);
				break;
			case '==':
				group.push(`this.${filter.key}.search(${filter.value})>-1`);
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
			let [modelname, property] = item.split('.');
			let prequery = {};
			prequery[property] = new RegExp(`.*${query[item]}.*`, 'i');
			let finds = await database[inflector.pluralize(modelname)].find({
				where: prequery
			});
			let term = modelname;
			switch (model.relations[modelname].type) {
				case 'belongsTo':
					term = model.relations[modelname].keyFrom;
					break;
				case 'hasMany':
					term = model.relations[modelname].keyTo;
					break;
			}
			searchgroup.filters.push({
				key: term,
				condition: 'some',
				value: finds.map(m => m._id)
			});
		} else {
			searchgroup.filters.push({
				key: item,
				condition: '==',
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
		query.push('(' + getQuery(filtergroup.filters) + ')');
	}
	if (query.length > 0) {
		query.splice(0, 0, 'var that=this;return ');
	} else {
		query.push('return true');
	}
	return query.join(' ') + ';';
}
