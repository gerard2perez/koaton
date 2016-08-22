"use strict";
const path = require("upath");
const ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const server = require(path.join(process.cwd(), "config", "server"));
if (GLOBAL.scfg === undefined) {
	GLOBAL.scfg = {
		port: process.env.port,
		env: process.env.NODE_ENV,
		isDev: process.env.NODE_ENV === "development",
		get host(){
			return this.isDev ? server.host.dev : server.host.prod;
		},
		get hostname() {
			if(this.host.match(ipformat)){
				return this.host;
			}else if(this.host.indexOf("www")===0){
				return this.host;
			}else{
				return "www."+this.host;
			}
		}
	};
	console.log(scfg);
}
