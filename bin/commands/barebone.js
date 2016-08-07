'use strict';
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
		let x = yield utils.exec("tput cols",["cols"],{shell:false});
		console.log(parseInt(x.stdout,10));
	}
};
