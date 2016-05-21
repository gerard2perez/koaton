'use strict';
/*eslint no-new-wrappers:0*/
const npmpackages={
	"postgres":"pg"
};
const ports = {
	"mongoose": 27017,
	"mysql": 3306,
	"postgres": 5432,
	"redis": 6379,
	"sqlite3": 0,
	"couchdb": 6984,
	"neo4j": 7474,
	"riak": 8087,
	"firebird": 3050,
	"tingodb": 27017,
	"rethinkdb": 29015
};
const alias = {
	'mongoose':["mongo"],
	'couchdb':["couch"],
	'mysql':["mariadb"]
};
const dt = {
	"Number": 'number',
	"Integer": 'number',
	"Float": 'number',
	"Double": 'number',
	"Real": 'number',
	"Boolean": 'boolean',
	"Date": 'date',
	"String": 'string',
	"Text": 'string',
	"Json": undefined,
	"BLOB": 'string'
};
let datatypes = {};
let adapters = {};
for (let type in dt) {
	//datatypes[dataname]=dataname;
	datatypes[type] = new String(type);
	Object.defineProperty(datatypes[type], "ember", {
		get: function() {
			return dt[type];
		}
	});
}
const getPort=function(adapter){
	return ports[adapter];
}
const getPackageName=function(adapter){
	return npmpackages[adapter] || adapter;
}
const hasAlias=function(adapter,ali){
	return adapter === ali;
}
for (let adapter in ports) {
	adapters[adapter] = new String(adapter);
	Object.defineProperty(adapters[adapter], "port", { get: getPort.bind(this,adapter) });
	Object.defineProperty(adapters[adapter], "package", { get: getPackageName.bind(this,adapter) });

	var aliases = Object.keys(alias).filter(hasAlias.bind(this,adapter));
	for(let adp in aliases){
		for(let al in alias[aliases[adp]]){
			adapters[alias[aliases[adp]][al]] = adapters[adapter];
		}
	}

}
// Object.defineProperty(String.prototype,"ember",{
// 	get:function(){
// 		return emberdatas[camintejs.indexOf(this)];
// 	}
// });
module.exports.datatypes = datatypes;
module.exports.adapters = adapters;
