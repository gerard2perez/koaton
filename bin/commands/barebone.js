'use strict';
const path = require("path");
let utils;
require("colors");
module.exports = {
	cmd: "barebone",
	description: "Run the needed commands to",
	args: ["koaton_app","ember_app","ember_app_mount"],
	options: [

	],
	action: function*(koaton_app,ember_app, ember_app_mount) {
		console.log(koaton_app,ember_app,ember_app_mount);
		utils = require('../utils');
		const proyect_path = path.join(process.cwd(),koaton_app);
		console.log(proyect_path);
		yield utils.shell("Creating the proyect",["koaton","new",koaton_app,"-f"],"/");
		yield utils.shell("Creating the proyect",["koaton","ember",ember_app, "-n","-m" ,ember_app_mount || "/"],proyect_path);
		yield utils.shell("Creating the proyect",["koaton", "model", "user", "active:number name email password note:text created:date","-e","restapp","-r"],proyect_path);
	}
};
