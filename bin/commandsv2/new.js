'use strict';
const adapters = require("../adapter").adapters;
const print = require('../console');
const path=require("path");
require('colors');

let utils = null;
const keys = Object.keys;
let proypath="";
let application="";

const setupInit = function*() {
	yield utils.mkdir(proypath);
	yield utils.mkdir(path.join(proypath,"ember"));
	yield utils.compile('app.js');
	yield utils.mkdir(path.join(proypath,"config"));
}
const setupConfig = function*() {
	const secret = require('../secret');
	yield utils.compile('config/models.js');
	yield utils.compile('config/views.js');
	yield utils.compile('config/inflections.js');
	yield utils.compile('config/ember.js');
	yield utils.compile('config/server.js', {
		key: `"${(yield secret(48)).toString('hex')}"`
	});
	yield utils.compile('config/connections.js');
	yield utils.compile('config/bundles.js');
	yield utils.compile('config/routes.js');

}
const setupAssets = function*() {
	yield utils.mkdir(path.join(proypath,"assets","img"));
	yield utils.copy("/public/img/koaton.png", 'assets/img/logo.png');
	yield utils.copy("/public/img/koaton2.png", 'assets/img/logo2.png');
	yield utils.mkdir(path.join(proypath,"assets","js"));
	yield utils.mkdir(path.join(proypath,"assets","css"));
	yield utils.copy("../bin/koaton-char.png", "assets/img/favicon.ico");
}
const setupOthers = function*() {
	yield utils.mkdir(path.join(proypath,"node_modules"));
	try {
		process.stdout.write(`   ${"Linking".cyan}: global koaton"`);
		fs.symlinkSync(path.join(__dirname, "/../"), path.join(proypath, "/node_modules/koaton"));
		console.log(": done".green);
	} catch (e) {
		console.log(e.toString());
		console.log(": already exists".green);
	}
	yield utils.mkdir(path.join(proypath,"controllers"));
	yield utils.mkdir(path.join(proypath,"models"));
	yield utils.mkdir(path.join(proypath,"public"));
	yield utils.mkdir(path.join(proypath,"public","img"));
	yield utils.mkdir(path.join(proypath,"views","layouts"));
	yield utils.copy("/views/layouts/main.handlebars");
	yield utils.compile('/views/index.html', {
		application: application
	});
	yield utils.compile('bower.json', {
		application: application
	});
}
const setupDependencies = function*(options,db) {
	const shell = utils.shell;
	var pk = require('../../templates/package');
	pk.name = application;
	if (!options.skipNpm) {
		yield utils.write(path.join(application, "package.json"), JSON.stringify(pk, null, '\t'), null);
		console.log(print.line1);
		yield shell("Installing npm dependencies", ["npm", "install", "--loglevel", "info"], application);
		yield shell("Installing adapter " + db.package.green, ["npm", "install", db.package, "--save", "--loglevel", "info"], application);
		//yield shell("Installing engine " + eg.green, eg, application);
	} else {
		pk.dependencies[eg[2]] = "latest";
		pk.dependencies[db[2]] = "latest";
		yield utils.write(path.join(application, "package.json"), JSON.stringify(pk, null, '\t'), null);
	}
	if (!options.skipBower) {
		yield shell("Installing bower dependencies", ["bower", "install"], application);
	}
}

module.exports = {
	cmd: "new",
	description: `Creates a new koaton aplication.`,
	args: ["app_name"],
	options: [
		[
			"-d", "--db <driver>",
			"[ ".yellow +
			keys(adapters).map(function(tx) {
				return tx.cyan;
			}).join(" | ".yellow) + " ]".yellow
		],
		[
			"-e", "--view-engine <engine>",
			"[ ".yellow + ["handlebars", "ejs"].map(function(tx) {
				return tx.cyan;
			}).join(" | ".yellow) + " ]".yellow
			//"[ atpl|doT|dust|dustjs-linkedin|eco|ect|ejs|haml|haml-coffee|hamlet|handlebars|hogan|htmling|jade|jazz\n\t\t\t\t jqtpl|JUST|liquor|lodash|mote|mustache|nunjucks|QEJS|ractive|react|slm|swig|templayed|twig|liquid|toffee\n\t\t\t\t underscore|vash|walrus|whiskers ]"
		],
		["-f", "--force", "Overrides the existing directory."],
		["-n", "--skip-npm", "Omits npm install"],
		["-b", "--skip-bower", "Omits bower install"]
	],
	action: function*(app_name, options) {
		const prompt = require('co-prompt');
		utils = require('../utils');
		application = app_name;
		proypath = path.resolve(app_name);
		if (!application) {
			console.log(`${colors.yellow('The command requires a name to run.\n\tkoaton -h\nto see help.')}`);
			process.die(1);
		}
		//const db = ;/
		const eg = "handlebars";//engine(options.viewEngine);
		var empty = utils.isEmpty(proypath);
		var ok = true;
		if (!(empty || options.force)) {
			ok = yield prompt.confirm(`destination ${utils.from_env.yellow} is not empty, continue? [y/n]: `);
		}
		if (ok) {
			process.stdin.destroy();
			utils.to_env = path.join(utils.to_env, application);
			yield setupInit();
			yield setupAssets();
			yield setupConfig();
			yield setupOthers();
			yield setupDependencies(options,adapters[options.db||"mongo"]);
		} else {
			utils.abort('aborting');
			return 1;
		}
		process.on('exit', () => {
			console.log(print.line1);
			console.log("   To run your app first: ");
			console.log('     $' + ' cd %s '.bgWhite.black, application);
			console.log('   and then: ');
			console.log('     $' + ' koaton serve '.bgWhite.black);
			console.log(print.line3("or"));
			console.log('     $' + 'cd %s && koaton serve '.bgWhite.black, application);
			console.log();
			console.log();
		});
	}
};
