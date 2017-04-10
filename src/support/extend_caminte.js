import * as Promise from 'bluebird';

const promesifythem = ['exists', 'create', 'findOrCreate', 'findOne', 'findById', 'find', 'all', 'run', 'updateOrCreate', 'upsert', 'update', 'remove', 'destroyById', 'destroy', 'count'
// , 'destroyAll'
];

export default function (model) {
	for (const fn of promesifythem) {
		if (model[fn]) {
			const magic = model[fn].bind(model);
			model.rawAPI[fn] = magic;
			model[fn] = function (...args) {
				return new Promise(function (resolve, reject) {
					magic(...args, function (err, res) {
						if (err) {
							reject(err);
						} else {
							resolve(res);
						}
					});
				});
			};
			switch (fn) {
				case 'create':
					model[fn] = function (data) {
						data.created = Date.now();
						data.updated = data.created;
						return magic(data);
					};
					break;
				case 'update':
					model[fn] = function (query, data) {
						data.updated = Date.now();
						return magic(query, data);
					};
					break;
				default:
					break;
			}
		}
		model.rawWhere = function rawWhere (stringquery, opts) {
			let that = this;
			return new Promise(function (resolve, reject) {
				let where = that.$where(stringquery);
				for (let prop in opts) {
					/* istanbul ignore else */
					if (where[prop]) {
						where = where[prop](opts[prop]);
					}
				}
				where.exec((err, result) => {
					/* istanbul ignore if */
					if (err) {
						reject(err);
					} else {
						resolve(result.map((r) => {
							let rr = {};
							for (let p in r.toObject()) {
								if (p === '_id') {
									rr.id = r._id;
								} else if (p !== '__v') {
									rr[p] = r[p];
								}
							}
							return rr;
						}));
					}
				});
			});
		}.bind(model.adapter);
		model.rawCount = function rawCount (stringquery) {
			return new Promise((resolve, reject) => {
				this.$where(stringquery).count((err, result) => {
					/* istanbul ignore if */
					if (err) {
						reject(err);
					} else {
						resolve(result);
					}
				});
			});
		}.bind(model.adapter);
		model.findcre = function (...args) {
			let [query, data, cb] = args;
			/* istanbul ignore else */
			if (cb === undefined) {
				cb = data;
				data = {};
			}
			let that = model;
			data = Object.assign({}, data);
			Object.keys(query).forEach(function (field) {
				data[field] = query[field];
			});
			return that.findOne({where: query}).then((res) => {
				return that.create(data);
			});
		};
	}
	return model;
}
