'use strict';
const path = require("upath");
const fs = require('graceful-fs');
let ember_proyect_path;
let utils;
const newproyect = function*(app_name, options) {
	const buildcmd = require("./build");
	const prompt = require("co-prompt");
	let override = !utils.canAccess(ember_proyect_path);
	if (!override && app_name && !options.force) {
		override = yield prompt.confirm(`destination ${ember_proyect_path} is not empty, continue? [y/n]: `);
		if (override) {
			utils.deleteFolderRecursive(ember_proyect_path);
		}
	}
	if (override || options.force) {
		yield utils.shell(`Installing ${app_name.green}`, ["ember", "new", app_name, "-dir", ember_proyect_path], process.cwd());
		options.mount = options.mount === undefined ? "/" : path.join("/", options.mount);
		yield utils.mkdir(path.join("ember", app_name, "app", "initializers"));
		yield buildcmd.getInflections(app_name,true);
		return false;
	} else {
		return true;
	}

}
module.exports = {
	cmd: "ember",
	alias: "ex",
	description: "If no app_name epecified it lists all the installed ember apps.",
	args: ["app_name"],
	options: [
		["-n", "--new", "Creates a new ember app with the especified named."],
		["-f", "--force", "Overrides the current app."],
		["-u", "--use <ember_addon>", "Install the especified addon in the especified app."],
		["-m", "--mount <path>", "(Default: /) Sets the mounting path in the koaton app. Can be used with -n or alone."],
		["-b", "--build <env>", "[ development | production] Builds the especified ember app in the Koaton app."],
		["-s", "--subdomain <subdomain>", "(Default: www) Sets the subdomain to mount the application."]
	],
	action: function*(app_name, options) {
		utils = require("../utils");
		ember_proyect_path = path.join(process.cwd(), "ember", app_name);
		if (app_name === undefined) {
			fs.readdirSync('./ember').forEach((dir) => {
				const f = require(`${process.cwd()}/ember/${dir}/bower.json`);
				console.log(`${dir}@${f.dependencies.ember}`);
			});
			return 1;
		}
		if (options.use) {
			let res = yield utils.shell(`Installing ${options.use.green} addon on ${app_name.cyan}`, ["ember", "i", options.use], ember_proyect_path);
			console.log(!res ? "Success".green : "Failed".red);
			return res;
		} else if (options.new) {
			if (yield newproyect(app_name, options)) {
				return 0;
			}
		} else if (options.build) {
			const buildcmd = require("./build");
			const embercfg = require(path.join(process.cwd(), "config", "ember"))[app_name];
			yield buildcmd.preBuildEmber(app_name, embercfg);
			yield buildcmd.buildEmber(app_name, {
				mount: embercfg.directory,
				build: options.buid
			});
			yield buildcmd.postBuildEmber(app_name, embercfg);
			return 0;
		}
		if (!options.build) {
			const connections = require(`${process.cwd()}/config/connections`);
			const connection = require(`${process.cwd()}/config/models`).connection;
			const port = require(`${process.cwd()}/config/server`).port;
			const host = connections[connection].host;
			options.mount = path.join('/', options.mount || "");
			options.mount = options.mount.replace(/\\/igm, "/");
			//console.log(`mounting ${app_name.green} on path ${options.mount.cyan}`);
			yield utils.mkdir(path.join(process.cwd(), "ember", app_name, "app", "adapters"));
			yield utils.compile('ember_apps/adapter.js',
				path.join("ember", app_name, "app", "adapters", "application.js"), {
					localhost: host,
					port: port
				});
			var emberjs = require(`${process.cwd()}/config/ember.js`);

			emberjs[app_name] = {
				mount: options.mount,
				directory: app_name,
				access: "public",
				subdomain:options.subdomain||"www"
			};
			yield utils.write(`${process.cwd()}/config/ember.js`, `"use strict";
module.exports=${ JSON.stringify(emberjs,null,'\t')};`, true);
			let embercfg = yield utils.read(path.join(ember_proyect_path, "config", "environment.js"), {
				encoding: 'utf-8'
			});
			embercfg = embercfg.replace(/baseURL: ?'.*',/, `baseURL: '${options.mount}',`);
			yield utils.write(path.join(ember_proyect_path, "config", "environment.js"), embercfg, true);
		}
		return 0;
	}
};
