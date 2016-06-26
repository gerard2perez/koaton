'use strict';
const path = require("upath");
const fs = require('graceful-fs');
let ember_proyect_path;
let utils;
const newproyect = function*(app_name, options) {
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
		["-b", "--build <env>", "[ development | production] Builds the especified ember app in the Koaton app."]
	],
	action: function*(app_name, options) {
		utils = require("../utils");
		if (app_name === undefined) {
			fs.readdirSync('./ember').forEach((dir) => {
				const f = require(`${process.cwd()}/ember/${dir}/bower.json`);
				console.log(`${dir}@${f.dependencies.ember}`);
			});
			return 1;
		}
		ember_proyect_path = path.join(process.cwd(), "ember", app_name);
		if (options.use) {
			let res = yield utils.shell(`Installing ${options.use.green} addon on ${app_name.cyan}`, ["ember", "i", options.use], ember_proyect_path);
			console.log(!res ? "Success".green : "Failed".red);
			return res;
		} else if (options.new) {
			if (yield newproyect(app_name, options)) {
				return 0;
			}
		} else if (options.build) {
			// process.exit(0);
			const embercfg = require(path.join(process.cwd(), "config", "ember"))[app_name];
			const mount_views = path.normalize(path.join(process.cwd(), "views", "ember_apps", embercfg.mount, "/"));
			const mount_css = path.normalize(path.join(process.cwd(), "public", embercfg.mount));
			const mount_public = path.normalize(path.join(process.cwd(),
			"ember", app_name,"dist"
			 ));
			if (yield utils.shell(
					`Building ... ${app_name.yellow}->${embercfg.mount.green}`, [
						"ember",
						"build",
						"--environment",
						options.build
						// , "-o", path.join("../../public/", embercfg.mount)
				],
					path.join(process.cwd(), "ember", app_name)
				)) {
				console.log(logstring.red);
				return 1;
			}
			yield utils.mkdir(mount_views);
			if (options.build === "development") {
				let text = yield utils.read(path.join(mount_public,"index.html"), {
					encoding: 'utf-8'
				});
				let indextemplate = yield utils.read(path.join(__dirname, "..", "templates", "ember_indexapp"), 'utf-8');
				let meta = new RegExp(`<meta ?name="${app_name}.*" ?content=".*" ?/>`);
				text = utils.Compile(indextemplate, {
					app_name: app_name,
					meta: text.match(meta)[0]
				});
				fs.unlinkSync(path.join(mount_public,"index.html"));
				yield utils.write(path.join(mount_views,"index.handlebars"), text, true);
			} else {
				fs.renameSync(path.join(mount_public,"index.html"), path.join(mount_views,"index.html"));
			}
			fs.renameSync(path.join(mount_public,"crossdomain.xml"), path.join(mount_views,"crossdomain.xml"));
			fs.renameSync(path.join(mount_public,"robots.txt"), path.join(mount_views,"robots.txt"));
			fs.unlinkSync(path.join(mount_public,"tests","index.html"));
			fs.rmdirSync(path.join(mount_public,"tests"));
			fs.unlinkSync(path.join(mount_public,"testem.js"));
			utils.deleteFolderRecursive(mount_css);
			fs.renameSync(path.join(mount_public), path.join(mount_css));
		}
		if (!options.build) {
			const connections = require(`${process.cwd()}/config/connections`);
			const connection = require(`${process.cwd()}/config/models`).connection;
			const port = require(`${process.cwd()}/config/server`).port;
			const host = connections[connection].host;
			options.mount = path.join('/', options.mount);
			options.mount = options.mount.replace(/\\/igm, "/");
			console.log(`mounting ${app_name.green} on path ${options.mount.cyan}`);
			yield utils.mkdir(path.join(process.cwd(), "ember", app_name, "app", "adapters"));
			yield utils.compile('ember_apps/adapter.js',
				path.join("ember", app_name, "app", "adapters", "application.js"), {
					localhost: host,
					port: port
				});
			var emberjs = require(`${process.cwd()}/config/ember.js`);

			emberjs[app_name] = {
				mount: options.mount
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
