'use strict';
const adapters = require("../adapter").adapters;
const keys = Object.keys;
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
		application = app_name;
		const proypath = path.resolve(app_name);
		utils.proyect_path = proypath;
		if (!application) {
			console.log(`${colors.yellow('The command requires a name to run.\n\tkoaton -h\nto see help.')}`);
			process.die(1);
		}
		const db = database(options.db);
		const eg = engine(options.viewEngine);
		var empty = utils.isEmpty(proypath);
		var ok = true;
		if (!(empty || options.force)) {
			ok = yield prompt.confirm(`destination ${colors.yellow(utils.proyect_path)} is not empty, continue? [y/n]: `);
		}
		if (ok) {
			process.stdin.destroy();
			utils.to_env = path.join(utils.to_env, application);
			return yield setupApplication(proypath, db, eg, options);
		} else {
			utils.abort('aborting');
			return 1;
		}
	}
};
