'use strict';
const adapters = require("../adapter").adapters;
const engines = require("../adapter").engines;
const print = require('../console');
const path = require("path");
const fs = require("graceful-fs");
const version = require("../utils").version;

require('colors');

let utils = null;
const keys = Object.keys;
let proypath = "";
let application = "";

const setupInit = function*() {
	yield utils.mkdir(proypath);
	yield utils.mkdir(path.join(proypath, "ember"));
	yield utils.compile('app.js');
	yield utils.mkdir(path.join(proypath, "config"));
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
	yield utils.mkdir(path.join(proypath, "assets", "img"));
	yield utils.copy("/public/img/koaton.png", 'assets/img/logo.png');
	yield utils.copy("/public/img/koaton2.png", 'assets/img/logo2.png');
	yield utils.mkdir(path.join(proypath, "assets", "js"));
	yield utils.mkdir(path.join(proypath, "assets", "css"));
	yield utils.copy("../bin/koaton-char.png", "assets/img/favicon.ico");
}
const setupOthers = function*() {
	yield utils.mkdir(path.join(proypath, "node_modules"));
	try {
		console.log(path.join(__dirname, "/../"));
		process.stdout.write(`   ${"Linking".cyan}: global koaton`);
		fs.symlinkSync(path.join(__dirname, "/../../"), path.join(proypath, "/node_modules/koaton"));
		console.log(": done".green);
	} catch (e) {
		console.log(e.toString());
		console.log(": already exists".green);
	}
	yield utils.mkdir(path.join(proypath, "controllers"));
	yield utils.mkdir(path.join(proypath, "models"));
	yield utils.mkdir(path.join(proypath, "public"));
	yield utils.mkdir(path.join(proypath, "public", "img"));
	yield utils.mkdir(path.join(proypath, "views", "layouts"));
	yield utils.copy("/views/layouts/main.handlebars");
	yield utils.compile('/views/index.html', {
		application: application
	});
	yield utils.compile('bower.json', {
		application: application
	});
}
const setupDependencies = function*(options, db, eg) {
	const shell = utils.shell;
	var pk = require('../../templates/package');
	pk.dependencies.koaton = version;
	pk.name = application;
	if (!options.skipNpm) {
		yield utils.write(path.join(proypath, "package.json"), JSON.stringify(pk, null, '\t'), null);
		console.log(print.line1);
		yield shell("Installing npm dependencies", ["npm", "install", "--loglevel", "info"], proypath);
		yield shell("Installing adapter " + db.package.green, ["npm", "install", db.package, "--save", "--loglevel", "info"], application);
		yield shell("Installing engine " + eg.green, ["npm", "install", eg, "--save", "--loglevel", "info"], proypath);
	} else {
		pk.dependencies[eg] = "x.x.x";
		pk.dependencies[db.package] = "x.x.x";
		yield utils.write(path.join(proypath, "package.json"), JSON.stringify(pk, null, '\t'), null);
	}
	if (!options.skipBower) {
		yield shell("Installing bower dependencies", ["bower", "install"], proypath);
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
				if (tx.indexOf("is") === 0) {
					return null;
				} else {
					return tx.cyan;
				}
			}).join(" | ".yellow) + " ]".yellow
		],
		[
			"-e", "--view-engine <engine>",
			"[ ".yellow + keys(engines).map(function(tx) {
				if (tx.indexOf("is") === 0) {
					return null;
				} else {
					return tx.cyan;
				}
			}).join(" | ".yellow) + " ]".yellow
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
			return 1;
		}
		var ok = true;
		if (!(utils.isEmpty(proypath) || options.force)) {
			ok = yield prompt.confirm(`destination ${utils.from_env.yellow} is not empty, continue? [y/n]: `);
		}
		if (ok) {
			process.stdin.destroy();
			utils.to_env = path.join(utils.to_env, application);
			yield setupInit();
			yield setupAssets();
			yield setupConfig();
			yield setupOthers();
			yield setupDependencies(options, adapters.isOrDef(options.db), engines.isOrDef(options.viewEngine));
			console.log(print.line1);
			console.log("   To run your app first: ");
			console.log('     $' + ' cd %s '.bgWhite.black, application);
			console.log('   and then: ');
			console.log('     $' + ' koaton serve '.bgWhite.black);
			console.log(print.line3("or"));
			console.log('     $' + 'cd %s && koaton serve '.bgWhite.black, application);
			console.log();
			console.log();
			return 0;
		} else {
			utils.abort('aborting');
			return 1;
		}
	}
};
