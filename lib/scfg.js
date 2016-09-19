"use strict";
const rawpath = require("path");
const path = require("upath");
const fs = require('graceful-fs');
const ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
let server = null;
if (GLOBAL.scfg === undefined) {
	GLOBAL.readDir=function(directory){
		try{
			return fs.readdirSync(directory);
		}catch(e){
			return [];
		}
	};
	GLOBAL.Events = function Events(path, event, phase,forcedir) {
		let Path = ProyPath(path);
		let m = requireNoCache(ProyPath(path, `${event}_${phase}`));
		switch (typeof m) {
			case "undefined":
			case undefined:
			case 'String':
			case 'Number':
			case 'Object':
				return function*() {}
			case 'function':
				return function*() {
					try {
						if (m.prototype===undefined || m.prototype.hasOwnProperty("constructor")) {
							m(forcedir||Path);
						} else {
							yield m(forcedir||Path);
						}
					} catch (e) {
						console.log(e.stack);
					}
				}

			default:
				return m.bind(null, Path);
		}
	};
	GLOBAL.requireSafe = function requireSafe(lib,defaults) {
		try {
			return require(lib);
		} catch (e) {
			if(defaults===undefined)
			{
				console.log(e.stack);
			}
			return defaults;
		}
	}
	GLOBAL.requireNoCache = function requireNoCache(lib) {
		let library = rawpath.normalize(rawpath.resolve(lib)).replace(".js", "") + ".js";
		delete require.cache[library];
		return requireSafe(library);
	}
	GLOBAL.ProyPath = function() {
		var args = Array.prototype.slice.call(arguments);
		args.splice(0, 0, process.cwd());
		return path.normalize(path.join.apply(path, args));
	};
	var dir = __dirname;
	GLOBAL.BinPath = function() {
		var args = Array.prototype.slice.call(arguments);
		args.splice(0, 0, "bin");
		args.splice(0, 0, "..");
		args.splice(0, 0, dir);
		return path.normalize(path.join.apply(path, args));
	};
	GLOBAL.LibPath = function() {
		var args = Array.prototype.slice.call(arguments);
		args.splice(0, 0, dir);
		return path.normalize(path.join.apply(path, args));
	};
	GLOBAL.TemplatePath = function() {
		var args = Array.prototype.slice.call(arguments);
		args.splice(0, 0, "templates");
		args.splice(0, 0, "..");
		args.splice(0, 0, dir);
		return path.normalize(path.join.apply(path, args));
	};
	if (process.env.isproyect === 'true') {
		const glob = require('glob');
		const MM = require('../bin/modelmanager');
		const updatefile = function() {
			fs.writeFileSync(path.join(process.cwd(), ".koaton"), JSON.stringify(Kmetadata, 2, 2));
		};
		if (!fs.existsSync(path.join(process.cwd(), ".koaton"))) {
			fs.writeFileSync(path.join(process.cwd(), ".koaton"), JSON.stringify({
				bundles: {},
				database: {
					models: {},
					relations: {}
				},
				commands: []
			}, 2, 2));
		}
		GLOBAL.Kmetadata = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".koaton")));
		Object.freeze(Kmetadata);
		Object.observe(Kmetadata.bundles, updatefile);
		Object.observe(Kmetadata.commands, updatefile);
		Object.freeze(Kmetadata.database);
		Object.observe(Kmetadata.database.models, updatefile);
		Object.observe(Kmetadata.database.relations, updatefile);
		Object.keys(Kmetadata.database.models).forEach((model) => {
			delete Kmetadata.database.models[model];
		});
		Object.keys(Kmetadata.database.relations).forEach((model) => {
			delete Kmetadata.database.relations[model];
		});
		glob.sync(ProyPath("models", "*.js")).forEach((files) => {
			let model = MM(path.basename(files).replace(".js", ""), require(files));
			let meta = model.toMeta();
			Kmetadata.database.models[model._modelname] = meta.model;
			if (meta.relations.length > 0) {
				Kmetadata.database.relations[model._modelname] = model.toMeta().relations;
			}
		});
	}
	GLOBAL.scfg = {
		get token_timeout(){
			return (this.isDev ? this._.token_timeout.dev:this._.token_timeout.pord) || 60;
		},
		get _() {
			if (server === null) {
				server = require(path.join(process.cwd(), "config", "server"));
			}
			return server;
		},
		port: process.env.port,
		env: process.env.NODE_ENV,
		isDev: process.env.NODE_ENV === "development",
		get host() {
			return this.isDev ? this._.host.dev : this._.host.prod;
		},
		get relations_mode() {
			return this._.relation_mode === 'ids';
		},
		get hostname() {
			if (this.host.match(ipformat)) {
				return this.host;
			} else if (this.host.indexOf("www") === 0) {
				return this.host;
			} else if (this.host !== "localhost") {
				return "www." + this.host;
			} else {
				return this.host;
			}
		}
	};
}
