"use strict";
let fs = require('fs');
let Waterline = require('koa-waterline');

module.exports = function (app, config) {
    config.models = {};
    fs.readdirSync(`${__dirname}/../models/`).forEach(function (file) {
        file = file.replace(".js", "");
        let model = require(`${__dirname}/../models/${file}`);
        config.models[app.inflect.pluralize(file)] = model;
    });

    app.use(Waterline(config));
    app.use(function* (next) {
        this.database = this._waterline.collections;
        yield next;
    });
}