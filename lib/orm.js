"use strict";
const Promise = require('bluebird');
const caminte = require(process.cwd()+'/node_modules/caminte');
const fs = require('fs');
const promesifythem = ['exists', 'create', 'findOrCreate', 'findOne', 'findById', 'find', 'all', 'run', 'updateOrCreate', 'upsert', 'update', 'remove', 'destroyById', 'destroy', 'destroyAll'];
const connection = require(process.cwd()+'/config/connections')[require(process.cwd()+'/config/models').connection];
module.exports = function(app) {
    let schema = new caminte.Schema(connection.driver, connection);
	schema.on('error',(a)=>{console.log(e);})
    let databases = {};
    fs.readdirSync(`${process.cwd()}/models/`).forEach(function(file) {
        file = file.replace(".js", "");
        let info = require(`${process.cwd()}/models/${file}`)(schema);
        let pl_name = app.inflect.pluralize(file);
        let model = schema.define(pl_name, info.model, info.config || {});
        model.rawAPI = {};
        databases[pl_name] = {};
        promesifythem.forEach(function(fn) {
            if (model[fn]) {
                model.rawAPI[fn] = model[fn];
                model[fn] = Promise.promisify(model[fn], { context: model });
            }
        });
        databases[pl_name]=model;
    });
    return function* orm(next) {
        this.db = databases;
        yield next;
    };
}
