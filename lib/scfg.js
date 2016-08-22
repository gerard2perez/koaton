"use strict";
const path = require("upath");
const ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
let server=null;
if (GLOBAL.scfg === undefined) {
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
}
