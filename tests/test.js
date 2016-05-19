"use strict";
/*eslint global-require:0*/
//process.stdout.write('clear');
//process.stdout.write('\e[3J');
//process.stdout.write('\x1Bc');
//process.stdout.write('clear');
process.stdout.write('\x1Bc');
let prefix = "";
const path = require('path');
const mkdir = require('../bin/utils').utils.mkdir;
const spawn = require('cross-spawn-async');
const Promise = require('bluebird');
require('colors');

const testdir = "running_test";
const commands = require('../bin/commands');
const koaton = Promise.promisify((command, cb) => {
	let buffer = "";
	const child = spawn("koaton", command, {
		cwd: testdir+prefix,
		shell: true
	});
	child.stderr.on('data', (data) => {
		buffer += data.toString();
	});
	process.stdin.pipe(child.stdin);
	child.stdout.on('data', (data) => {
		buffer += data.toString();
	});
	child.on('close', function () {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		cb(null, [child.exitCode, buffer.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "")]);
	});
});
const testengine = require('./engine');
const help = commands[0](commands).replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "") + "\n";
testengine(function* (suite) {
	yield mkdir(testdir);
	yield suite("koaton --help", function* (assert) {
		assert.expect(3);
		assert.equal(help, (yield koaton([""]))[1], "Renders help if not parameters");
		assert.equal(help, (yield koaton(["-h"]))[1], "Renders help -h");
		assert.equal(help, (yield koaton(["--help"]))[1], "Renders help --help");
	});
	yield suite("koaton new dummy",function*(assert){
		const cachepath =path.join(path.resolve(),"/running_test/dummy/package.json");
		assert.equal(0,(yield koaton(["new","dummy","-fnb"]))[0],"Creates a new app");
		assert.ok(require("../running_test/dummy/package.json").dependencies.mongoose,"Mongoose is the database driver.");
		assert.ok(require("../running_test/dummy/package.json").dependencies.handlebars,"Handlebars is the template engine.");
		delete require.cache[cachepath];

		assert.equal(0,(yield koaton(["new","dummy","-fnb","-d","postgres"]))[0],"-d postgres");
		assert.ok(require("../running_test/dummy/package.json").dependencies.pg,"Postgres is the database driver.");
		delete require.cache[cachepath];

		assert.equal(0,(yield koaton(["new","dummy","-fnb","-d","sqlite3","-e","ejs"]))[0],"-d sqlite3 -e ejs");
		assert.ok(require("../running_test/dummy/package.json").dependencies.ejs,"EJS is the template engine.");
		delete require.cache[cachepath];

		// process.stdout.write("    Creates a new app and installs all dependencies (way take a while)".white);
		// assert.equal(0,(yield koaton(["new","dummy","-f"]))[0],"Creates a new app and isntalls all dependencies (way take a while)");
	});
	yield suite("koaton ember restapi",function*(assert){
		prefix="/dummy/";
		process.stdout.write("    Installs the app.".white);
		assert.equal(0,(yield koaton(["ember","restapi","-nf"]))[1],"Installs the app.");
		assert.equal("/",require("../running_test/dummy/config/ember.js").restapi.mount,"Mount the app on /");
		assert.ok(require("../running_test/dummy/ember/restapi/app/adapters/application.js"),"Creates the default adapter.");
		assert.equal("/",require("../running_test/dummy/ember/restapi/config/environment.js")().baseURL,"Creates the default adapter.");
		prefix="";
	});
	yield suite("koaton adapter <driver>",function*(assert){
		const cachepath =path.join(path.resolve(),"/running_test/dummy/package.json");
		const r1 = yield koaton(["adapter","couchdb"]);
		assert.equal(0,r1[0],"Installs CouchDb Adapter");
		delete require.cache[cachepath];
		assert.ok(require("../running_test/dummy/package.json").dependencies.couchdb,"pacakge.js is updated");
		assert.equal(0,(yield koaton(["adapter","couchdb","-g"]))[0],"Generates the Adapter structure");
		assert.ok(require("../running_test/dummy/config/connections.js").couchdb,"Connections file is updated.");

const ccommand = yield koaton(["adapter","couchdb",
"-g",
"--host","192.168.0.1",
"--port","8080",
"--user","dummy",
"--password","pa$$w0rd",
"--db","awsome"
]);
		assert.equal(0,ccommand[0],"Command with custom paramentes");
		delete require.cache[path.join(path.resolve(),"/running_test/dummy/config/connections.js")];
		const dbadapter = require("../running_test/dummy/config/connections.js").couchdb;
		//console.log(dbadapter);
		
		assert.equal("192.168.0.1",dbadapter.host,"Host is ok");
		assert.equal(8080,dbadapter.port,"Port is ok");
		assert.equal("dummy",dbadapter.user,"User is ok");
		assert.equal("pa$$w0rd",dbadapter.password,"Password is secure");
		assert.equal("awsome",dbadapter.database,"Database is awsome");
	});
	yield suite("koaton model <name> <fields>",function*(assert){
		assert.ok(false,"upps");
	});
	yield suite("koaton build <config_file>",function*(assert){
		assert.ok(false,"upps");
	});
	yield suite("koaton serve",function*(assert){
		assert.ok(false,"upps");
	});
	yield suite("koaton forever",function*(assert){
		assert.ok(false,"upps");
	});
}).then((a)=>{
	process.exit(a);
}).catch((err)=>{
	console.log(err.toString().red);
	// process.exit(1);
});
