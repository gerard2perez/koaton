'use strict';
const commands = {
	"ember": {
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
		]
	},
	"new": {
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
		]
	}
};
module.exports = (commands) => {
	let help = "";
	delete commands[0];
	help += `  version: ${version}\n`;
	help += "  Command list:\n";
	commands.forEach(function(definition) {
		var args = definition.args.length > 0 ? `<${definition.args.join("> <")}>` : "";
		var opts = definition.options.length > 0 ? "[options]" : "";
		help += `    koaton ${definition.cmd} ${args.yellow} ${opts.cyan}\n`;
		help += `      ${definition.description.replace('\n',"\n   ")}\n`;
		definition.options.forEach(function(option) {
			var opt = option[1].split(' ');
			opt[0] = option[0] === opt[0] ? "" : opt[0];
			opt[1] = opt[1] || "";
			while (opt[0].length < 13) {
				opt[0] = opt[0] + " "
			}
			help += `      ${option[0].cyan} ${opt[0].gray} ${opt[1].cyan} ${option[2]}\n`;
		});
		help += "\n\n";
	});
	return help;
};
