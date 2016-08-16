'use strict';
const path = require("upath");
const fs = require('fs');
let utils;
require("colors");
module.exports = {
	cmd: "install",
	description: "SetUps a recent clonned proyect. (root/Administrator permission needed to work with nginx)",
	args: [],
	options: [],
	action: function*() {
		utils = require("../utils");
		try{
			yield utils.shell("finding nginx :3",["nginx","-t"],process.cwd());
			let nginxpath = utils.shell_log().toString().match(/.* file (.*)nginx\.conf test/)[1];
    		let conf = fs.readFileSync(nginxpath+"nginx.conf",'utf-8');
		    if(conf.indexOf('include enabled_sites/*')===-1){
		    	conf=conf.replace(/http ?\{/igm,"http {\n\tinclude enabled_sites/*.conf;");
				fs.writeFileSync(nginxpath+"nginx.conf",conf);
				console.log(`   ${"updated".cyan}: nginx.conf`);
		    }
		    utils.mkdir(nginxpath+"enabled_sites");
			let name = `${require(path.join(process.cwd(),"package.json")).name}.conf`;
			utils.Copy(path.join(process.cwd(),name),path.join(nginxpath,"enabled_sites",name));
			console.log(`   ${"copying".cyan}: ${name}`);
			yield utils.shell("Restarting Nginx",["nginx","-s","reload"],process.cwd());
		}catch(e){
			console.log(e.stack);
		}
		try {
			yield utils.mkdir(path.join(process.cwd(),"node_modules"));
			process.stdout.write(`   ${"Linking".cyan}: global koaton`);
			fs.symlinkSync(path.join(__dirname, "/../../"), path.join(process.cwd(), "/node_modules/koaton"));
			console.log(": done".green);
		} catch (e) {
			console.log(": already exists".green);
		}
		yield utils.shell("Installing bower dependencies",["bower","install"],process.cwd());
		return yield utils.shell("Installing npm dependencies", ["npm", "install", "--loglevel", "info"], process.cwd());
	}
};
