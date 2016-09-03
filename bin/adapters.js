var adapters = {
	"mongoose": 27017,
	"mysql": 3306,
	"mariadb": 3306,
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
module.exports.adapters=[];
module.exports.template=
	'{"driver": "{{driver}}","user": "{{user}}","database": "{{application}}","password": "{{password}}","port": {{port}},"host": "{{host}}","pool": false,"ssl": false}';
Object.keys(adapters).forEach((adapter)=>{
	module.exports.adapters.push(adapter);
});
//module.exports.connections = adapters;
