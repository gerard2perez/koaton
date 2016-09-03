'use strict';
/*eslint no-new-wrappers:0*/
const npmpackages = {
	"postgres": "pg"
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
	'mongoose': ["mongo"],
	'couchdb': ["couch"],
	'mysql': ["mariadb"]
};

//Koaton datatypes:target_system
const koaton={
	"number": 'Number',
	"integer": 'Integer',
	"float": 'Float',
	"double": 'Double',
	"real": 'Real',
	"boolean": 'Boolean',
	"string": 'String',
	"text": 'Text',
	"json": 'Json',
	"date": 'Date',
	"email":'Email',
	"password":"Password",
	"blob": 'Blob'
};

const caminte={
	"number": 'Number',
	"integer": 'Integer',
	"float": 'Float',
	"double": 'Double',
	"real": 'Real',
	"boolean": 'Boolean',
	"string": 'String',
	"text": 'Text',
	"json": 'Json',
	"date": 'Date',
	"email":'String',
	"password":"String",
	"blob": 'Blob'
};
const ember = {
	"password":"string",
	"number": 'number',
	"integer": 'number',
	"float": 'number',
	"double": 'number',
	"real": 'number',
	"boolean": 'boolean',
	"date": 'date',
	"email":'string',
	"string": 'string',
	"text": 'string',
	"json": undefined,
	"blob": 'string'
};
const crud = {
	"password":"password",
	"number": 'number',
	"integer": 'number',
	"float": 'number',
	"double": 'number',
	"real": 'number',
	"boolean": 'boolean',
	"date": 'date',
	"email":'email',
	"string": 'text',
	"text": 'text',
	"json": undefined,
	"blob": 'text'
};
let datatypes = {};
let adapters = {};
for (let type in caminte) {
	Object.defineProperty(datatypes,koaton[type],{
		get:function(){
			return datatypes[type];
		}
	})
	datatypes[type] = new String(type);

	Object.defineProperty(datatypes[type], "ember", {
		get: function() {
			return ember[type];
		}
	});
	Object.defineProperty(datatypes[type], "crud", {
		get: function() {
			return crud[type];
		}
	});
	Object.defineProperty(datatypes[type], "caminte", {
		get: function() {
			return caminte[type];
		}
	});
	Object.defineProperty(datatypes[type], "koaton", {
		get: function() {
			return koaton[type];
		}
	});
	// datatypes[type.toLowerCase()] = datatypes[type];
}
const getPort = function(adapter) {
	return ports[adapter];
}
const getPackageName = function(adapter) {
	return npmpackages[adapter] || adapter;
}
const hasAlias = function(adapter, ali) {
	return adapter === ali;
}
for (let adapter in ports) {
	adapters[adapter] = new String(adapter);
	Object.defineProperty(adapters[adapter], "port", {
		get: getPort.bind(this, adapter)
	});
	Object.defineProperty(adapters[adapter], "package", {
		get: getPackageName.bind(this, adapter)
	});

	var aliases = Object.keys(alias).filter(hasAlias.bind(this, adapter));
	for (let adp in aliases) {
		for (let al in alias[aliases[adp]]) {
			adapters[alias[aliases[adp]][al]] = adapters[adapter];
		}
	}

}
const engines = ["atpl", "doT", "dust", "dustjs-linkedin", "eco", "ect", "ejs", "haml", "haml-coffee", "hamlet", "handlebars", "hogan", "htmling", "jade", "jazz", "jqtpl", "JUST", "liquor", "lodash", "mote", "mustache", "nunjucks", "QEJS", "ractive", "react", "slm", "swig", "templayed", "twig", "liquid", "toffee", "underscore", "vash", "walrus", "whiskers"];
const tested_engines = ["handlebars", "ejs"];

let avaliablengines = {};
for (let engine in engines) {
	if (tested_engines.indexOf(engines[engine]) > -1) {
		avaliablengines[engines[engine]] = engines[engine];
	}
}
adapters.isOrDef = function(adpt) {
	return this[adpt] === undefined ? this.mongo : this[adpt];
}
avaliablengines.isOrDef = function(adpt) {
	return this[adpt] === undefined ? this.handlebars : this[adpt];
}
exports.engines = avaliablengines;
module.exports.datatypes = datatypes;
module.exports.adapters = adapters;
module.exports.template =
	'{"driver": "{{driver}}","user": "{{user}}","database": "{{application}}","password": "{{password}}","port": {{port}},"host": "{{host}}","pool": false,"ssl": false}';
