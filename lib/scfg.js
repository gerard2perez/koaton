"use strict";
const path = require("upath");
const fs = require('graceful-fs');
const ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
let server=null;
if (GLOBAL.scfg === undefined) {
	const updatefile = function(){
		fs.writeFileSync(path.join(process.cwd(),".koaton"),JSON.stringify(Kmetadata,2,2));
	};
	if(!fs.existsSync(path.join(process.cwd(),".koaton"))){
		fs.writeFileSync(path.join(process.cwd(),".koaton"),JSON.stringify({
			bundles:{},
			database:{models:{},relations:{}}
		},2,2));
	}
	GLOBAL.Kmetadata = JSON.parse(fs.readFileSync(path.join(process.cwd(),".koaton")));
	Object.freeze(Kmetadata);
	Object.observe(Kmetadata.bundles,function(changes){
		changes.forEach((c)=>{
			console.log(typeof c.object[c.name]);
		});
		fs.writeFileSync(path.join(process.cwd(),".koaton"),JSON.stringify(Kmetadata,2,2));
	});
	Object.freeze(Kmetadata.database);
	Object.observe(Kmetadata.database.models,updatefile);
	Object.observe(Kmetadata.database.relations,updatefile);
	GLOBAL.scfg = {
		get _(){
			if(server===null){
				server = require(path.join(process.cwd(), "config", "server"));
			}
			return server;
		},
		port: process.env.port||62626,
		env: process.env.NODE_ENV,
		isDev: process.env.NODE_ENV === "development",
		get host(){
			return this.isDev ? this._.host.dev : this._.host.prod;
		},
		get relations_mode(){
			return this._.relation_mode === 'ids';
		},
		get hostname() {
			if(this.host.match(ipformat)){
				return this.host;
			}else if(this.host.indexOf("www")===0){
				return this.host;
			}else if(this.host!=="localhost"){
				return "www."+this.host;
			}else{
				return this.host;
			}
		}
	};
}
