import * as Promise from 'bluebird';

const promesifythem = ['exists', 'create', 'findOrCreate', 'findOne', 'findById', 'find', 'all', 'run', 'updateOrCreate', 'upsert', 'update', 'remove', 'destroyById', 'destroy', 'count'
	//, 'destroyAll'
];

export default function(model) {
	for (const fn in promesifythem) {
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
			this.rawAPI.find(filter, cb);
		}, {
			context: model
		});
	}
	return model;
}
