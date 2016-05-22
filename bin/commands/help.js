'use strict';
const version = require('../../package.json').version;
const hmany = function(commands){
	let help = "";
	help += `  version: ${version}\n`;
	help += "  Command list:\n";
	for(let name in commands){
		help+=hsingle(commands[name]);
	}
	return help;
}
const hsingle=function(definition){
	let help="";
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
	return help + "\n\n";
};
module.exports.many = hmany;
module.exports.simgle = hsingle;
