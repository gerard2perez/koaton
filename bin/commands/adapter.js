'use strict';
const path = require("path");
const adapters = require("../adapter").adapters;
const adapterTemplate = require("../adapter").template;
let utils;
require("colors");
const handleGenerate = function*(driver,options){
	if (!options.generate) {
		yield utils.shell(`Installing ${adapters[driver].package.green}`, ["npm", "i", adapters[driver].package, "--save"], process.cwd());
		delete require.cache[path.resolve() + "/package.json"];
		console.log(`${driver}@${require(path.resolve() + "/package.json").dependencies[adapters[driver].package]} installed`);
	}
		let adapterCFG = JSON.parse(utils.Compile(adapterTemplate, {
			adapter: driver,
			driver: adapters[driver].package,
			user: options.user || '',
			password: options.password || '',
			host: options.host || 'localhost',
			port: options.port || adapters[driver].port,
			application: options.db || path.basename(process.cwd())
		}), "\t");
		if (driver === "sqlite3") {
			delete adapterCFG.port;
			delete adapterCFG.host;
			delete adapterCFG.pool;
			delete adapterCFG.ssl;
		}
		var connections = require(process.cwd() + "/config/connections");
		connections[driver] = adapterCFG;
		const output = '"use strict";\nmodule.exports=' + JSON.stringify(connections, null, '\t') + ";";
		yield utils.write(process.cwd() + "/config/connections.js", output, true);

}
module.exports = {
	cmd: "adapter",
	description: "Install the especified driver adapter.",
	args: ["driver"],
	options: [
		["-l", "--list", "Show the adapters installed in the current application. " + "koaton adapter -l".bgWhite.black],
		["-u", "--uninstall", "Removes the driver"],
		["-g", "--generate", "Creates an adapter template for the especified driver"],
		["--host", "--host <hostname>", "Default is localhost. Use this with -g"],
		["--port", "--port <port>", "Default driver port. Use this with -g"],
		["--user", "--user <username>", "User to connect to database default is ''. Use this with -g"],
		["--db", "--db <databse>", "Database name for the connection default is ''. Use this with -g"],
		["--password", "--password <databse>", "Password to login in your database default is ''. Use this with -g"]
	],
	action: function*(driver, options) {
		utils = require("../utils");
		const dependencies = require(path.resolve() + "/package.json").dependencies;
		let installed = {};
		let available = {};
		delete adapters.isOrDef;
		for (let adapter in adapters) {
			if(dependencies[adapters[adapter].package]!==undefined){
				installed[adapters[adapter].toString()] = adapters[adapter].package;
			}else{
				available[adapters[adapter].toString()] = adapters[adapter].package;
			}
		}
		if (adapters[driver] === undefined) {
			console.log("The driver you especied is not available please check: ".yellow);
			console.log();
			options.list = true;
		}
		let makelist = (!options.generate && available[driver] === undefined);
		if (options.uninstall) {
			yield utils.shell(`Uninstalling ${adapters[driver].green}`, ["npm", "uninstall", adapters[driver].package], process.cwd());
		} else if ( options.list || makelist ) {
			console.log("Installed drivers: ");
			Object.keys(installed).forEach((driver) => {
				console.log(`\t${driver}@${installed[driver].cyan}`);
			});
			console.log();
			console.log("Available drivers: ");
			Object.keys(available).forEach((driver) => {
				console.log(`\t${driver}`);
			});
		} else {
			yield handleGenerate(driver,options);
		}
		return makelist ? 1:0;
	}
};
