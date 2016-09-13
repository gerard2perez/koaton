'use strict';
let utils;
require("colors");
const copytemplates = function* copytemplates(folder) {
	const fs = require('graceful-fs');
	const glob = require('glob');
	const path = require('upath');
	const files = glob.sync(ProyPath(folder, "**", "*.?(js|handlebars)"));
	for(let idx in files){
		let file = path.normalize(files[idx]);
		let filename = path.basename(file);
		let location = file.replace(filename, "").replace(path.normalize(process.cwd()), "");
		yield utils.mkdir(Dest(location));
		let regex_css = /\{\{\{bundle \"([^ \"]*).css\"\}\}\}/igm;
		let regex_js = /\{\{\{bundle \"([^ \"]*).js\"\}\}\}/igm;
		let hbs = fs.readFileSync(file, 'utf-8');
		let found;
		while(( found = regex_css.exec(hbs))!==null){
			let target = Kmetadata.bundles[`${found[1]}.css`];
			if(target!==undefined)
			{
				hbs = hbs.replace(found[0],`<link rel="stylesheet" href="/${path.join("koaton_toolkit",target)}"/>`);
			}
		}
		while(( found = regex_js.exec(hbs))!==null){
			let target = Kmetadata.bundles[`${found[1]}.js`];
			if(target!==undefined)
			{
				hbs = hbs.replace(found[0],`<script src="/${path.join("koaton_toolkit",target)}"></script>`);
			}
		}
		fs.writeFileSync(Dest(location, filename), hbs);
	}
}
const copyall = function copyall(folder) {
	let promises = [];
	const glob = require('glob');
	const path = require('upath');
	glob.sync(ProyPath(folder, "**", "*.?(js|handlebars)")).forEach(function(file) {
		file = path.normalize(file);
		let filename = path.basename(file);
		let location = file.replace(filename, "").replace(path.normalize(process.cwd()), "");
		utils.mkdir(Dest(location));
		promises.push(utils.Copy(file, Dest(location, filename)));
	})
	return Promise.all(promises);
}
const preServe = `
`;
const Dest = function Dest() {
	var args = Array.prototype.slice.call(arguments);
	//args.splice(0, 0, "modulifyoutput");
	args.splice(0, 0, "koaton_toolkit");
	args.splice(0, 0, "koaton_modules");
	args.splice(0, 0, "myclinic");
	args.splice(0, 0, "..");

	return ProyPath.apply(this, args);
}
module.exports = {
	cmd: "modulify",
	description: "Run the needed commands to",
	args: [],
	options: [

	],
	action: function*() {
		const bluebird = require('bluebird');
		const ncp = bluebird.promisify(require('ncp').ncp);
		yield Events("events", "pre", "modulify");
		utils = require('../utils');
		utils.rmdir(Dest());
		yield utils.shell("Building for production".green,["koaton","build","-p"]);
		utils.mkdir(Dest("controllers"));
		utils.mkdir(Dest("events"));
		utils.mkdir(Dest("views"));
		utils.mkdir(Dest("routes"));
		utils.mkdir(Dest("config"));
		utils.mkdir(Dest("commands"));
		utils.Copy(ProyPath("config", "ember.js"), Dest("config", "ember.js"))
		yield ncp(ProyPath('public'), Dest("public"));
		yield copyall("commands");
		yield copyall("controllers");
		yield copyall("events");
		yield copytemplates("views");
		yield copyall("routes");

		Object.keys(require(ProyPath("config", "ember"))).forEach((ember_app) => {
			utils.rmdir(Dest("public", ember_app, "index.html"));
			utils.rmdir(Dest("public", ember_app, "crossdomain.xml"));
			utils.rmdir(Dest("public", ember_app, "robots.txt"));
		});

		utils.rmdir(Dest("events", "pre_modulify.js"));
		utils.rmdir(Dest("events", "post_modulify.js"));
		utils.writeSync(Dest("events", "pre_serve.js"), preServe);

		try {
			yield Events("events", "post", "modulify", Dest());
		} catch (e) {
			console.log(e.stack);
		}
	}
};
