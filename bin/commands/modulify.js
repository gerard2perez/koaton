'use strict';
let utils;
require("colors");
const copyall  = function copyall(folder){
	let promises=[];
	const glob = require('glob');
	const path = require('upath');
	glob.sync(ProyPath(folder,"**","*.?(js|handlebars)")).forEach(function (file){
		file = path.normalize(file);
		let filename = path.basename(file);
		let location = file.replace(filename,"").replace(path.normalize(process.cwd()),"");
		utils.mkdir(ProyPath("modulifyoutput",location));
		promises.push(utils.Copy(file,ProyPath("modulifyoutput",location,filename)));
	})
	return Promise.all(promises);
}
const preServe=`
`;
module.exports = {
	cmd: "modulify",
	description: "Run the needed commands to",
	args: [],
	options: [

	],
	action: function*() {
		const bluebird = require('bluebird');
		const ncp = bluebird.promisify(require('ncp').ncp);
		yield Events("events","pre","modulify");
		utils = require('../utils');
		utils.rmdir(ProyPath("modulifyoutput"));
		//yield utils.shell("Building for production".green,["koaton","build","-p"]);
		utils.mkdir("modulifyoutput/controllers");
		utils.mkdir("modulifyoutput/events");
		utils.mkdir("modulifyoutput/views");
		utils.mkdir("modulifyoutput/routes");
		utils.mkdir("modulifyoutput/config");
		utils.mkdir("modulifyoutput/commands");

		utils.Copy(ProyPath("config","ember.js"),ProyPath("modulifyoutput","config","ember.js"))
		yield ncp(ProyPath('public'),ProyPath("modulifyoutput","public"));
		yield copyall("commands");
		yield copyall("controllers");
		yield copyall("events");
		yield copyall("views");
		yield copyall("routes");
		Object.keys(require(ProyPath("config","ember"))).forEach((ember_app)=>{
			utils.rmdir(ProyPath("modulifyoutput/public",ember_app,"index.html"));
			utils.rmdir(ProyPath("modulifyoutput/public",ember_app,"crossdomain.xml"));
			utils.rmdir(ProyPath("modulifyoutput/public",ember_app,"robots.txt"));
		});
		utils.rmdir(ProyPath("modulifyoutput/events","pre_modulify.js"));
		utils.rmdir(ProyPath("modulifyoutput/events","post_modulify.js"));
		utils.writeSync(ProyPath("modulifyoutput/events","pre_serve.js"),preServe);

		try{
		yield Events("events","post","modulify");
	}catch(e){
		console.log(e.stack);
	}
		console.log("hola");
	}
};
