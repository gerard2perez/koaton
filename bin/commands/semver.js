'use strict';
let utils;
require("colors");
module.exports = {
	cmd: "semver",
	description: "mode can be major, minor, patch, beta, beta_major, alpha, alpha_major",
	args: ["mode"],
	options: [],
	action: function*(mode) {
		utils = require('../utils');
		let packageJSON = JSON.parse(yield utils.read("package.json"));
		let version = packageJSON.version.split("-");
		let beta = version[1] || "";
		beta = beta.split(".");
		version = version[0].split(".");
		switch (mode) {
			case "major":
				version[0] = parseInt(version[0] + 1, 10);
				version[1] = 0;
				version[2] = 0;
				beta = undefined;
				break;
			case "minor":
				version[0] = 0;
				version[1] = parseInt(version[1] + 1, 10);
				version[2] = 0;
				beta = undefined;
				break;
			case "patch":
				version[0] = 0;
				version[1] = 0;
				version[2] = parseInt(version[2] + 1, 10);
				beta = undefined;
				break;
			case "alpha":
				console.log(version);
				console.log(beta);
				if (beta.length === 2 && beta[0] === "alpha") {
					beta[1] = parseInt(beta[1], 10) + 1;
				} else {
					version[1] = parseInt(version[1], 10) + 1;
					version[2] = 0;
					beta[0] = "alpha";
					beta[1] = 1;
				}
				console.log(version);
				console.log(beta);
				break;
			case "alpha_major":
				if (beta.length === 2 && beta[0] === "alpha") {
					beta[1] = parseInt(beta[1], 10) + 1;
				} else {
					version[0] = parseInt(version[0], 10) + 1;
					beta[0] = "beta";
					beta[1] = 1;
				}
				break;
			case "alpha_minor":
				if (beta.length === 2 && beta[0] === "alpha") {
					version[2] = parseInt(version[2], 10) + 1;
				}
				break;
			case "beta":
				if (beta.length === 2 && beta[0] === "beta") {
					beta[1] = parseInt(beta[1], 10) + 1;
				}else if (beta.length === 2 && beta[0] === "alpha") {
					version[2]=0;
					beta[0] = "beta";
					beta[1] = 1;
				} else {
					version[1] = parseInt(version[1], 10) + 1;
					beta[0] = "beta";
					beta[1] = 1;
				}
				break;
			case "beta_major":
				if (beta.length === 2 && beta[0] === "beta") {
					beta[1] = parseInt(beta[1], 10) + 1;
				} else {
					version[0] = parseInt(version[0], 10) + 1;
					beta[0] = "beta";
					beta[1] = 1;
				}
				break;
			case "beta_minor":
				if (beta.length === 2 && beta[0] === "beta") {
					version[2] = parseInt(version[2], 10) + 1;
				}
				break;
			case "release":
				beta = undefined;
				break;
			default:
				console.log("No mode specified...");
				return -1;
		}
		let final = version.join(".") + (beta ? "-" + beta.join(".") : "");
		packageJSON.version = final;
		yield utils.write("package.json", JSON.stringify(packageJSON, null, 2), -1);
		return 0;
	}
};
