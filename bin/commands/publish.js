'use strict';
let utils;
require("colors");
const versions=["alpha","alpha_minor","alpha_major","beta","beta_minor","beta_major","major","minor","patch"];
const options=["latest","alpha","beta"];
function validate(version){
	return versions.indexOf(version);
}
function validateTag(version){
	return options.indexOf(version);
}
module.exports = {
	cmd: "publish",
	description: "Take the actions needed to commit and publish a new version of your app.",
	args: [/*"koaton_app","ember_app","ember_app_mount"*/],
	options: [
		["-t", "--tag <tag>", `[${options.map((v)=>{return v.cyan}).join(" | ")}] Optional taganame to publish on npm`],
		["-v", "--semver <version>", `[${versions.map((v)=>{return v.cyan}).join(" | ")}] Select if you want to increse your pakage version`],
		["-m", "--message <message>", "This is the message that would be added to the commit"]
	],
	action: function*(options) {
		utils = require('../utils');
		yield utils.shell("Building assets for production",["koaton","build","-p"],process.cwd());
		console.log(utils.shell_log());
		if(options.semver!==undefined && validate(options.semver) ){
			yield utils.shell("Dumping version",["koaton","semver",options.semver],process.cwd());
		}
		options.message=options.message||Date.now().toString()+" uncommented.";
		yield utils.shell("Adding changes",["git","add","--all"],process.cwd());
		yield utils.shell("Commiting changes",["git","commit","-m",options.message],process.cwd());
		console.log(utils.shell_log());
		yield utils.shell("Pushing changes",["git","push"],process.cwd());
		if(options.tag!==undefined && validateTag(options.tag)){
			yield utils.shell("Publishing to npm",["npm","publish","--tag",options.tag],process.cwd());
		}
	}
};
