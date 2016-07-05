"use strict";
/*eslint global-require:0*/
//process.stdout.write('clear');
//process.stdout.write('\e[3J');
//process.stdout.write('\x1Bc');
//process.stdout.write('clear');
process.stdout.write('\x1Bc');
let prefix = "";
const path = require('path');
const mkdir = require('../bin/utils').mkdir;
const read = require('../bin/utils').read;
const compile = require('../bin/utils').Compile;
const spawn = require('cross-spawn-async');
const Promise = require('bluebird');
const exists = require("fs").existsSync;
require('colors');
const testdir = "running_test";
const koaton = Promise.promisify((command, cb) => {
	console.log(path.join(process.cwd(), testdir, prefix));
	let buffer = "";
	const child = spawn("koaton", command, {
		cwd: path.join(process.cwd(), testdir, prefix),
		shell: true
	});
	child.stderr.on('data', (data) => {
		buffer += data.toString();
	});
	process.stdin.pipe(child.stdin);
	child.stdout.on('data', (data) => {
		buffer += data.toString();
	});
	child.on('close', function() {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		cb(null, [child.exitCode, buffer.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "")]);
	});
});
const testengine = require('./engine');
const commands = require("../bin/commands");
const h = require("../bin/commands/help").many;
const help = h(commands).replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "") + "\n";
testengine(function*(suite) {
	yield suite({
		equal: (expected, koatonresult, text, ae) => {
			if (koatonresult instanceof Array) {
				if (typeof(expected) === "number") {
					expected = ae(expected, koatonresult[0], text);
				} else {
					expected = ae(expected, koatonresult[1], text);
				}
				if (!expected) {
					console.log("koaton says:");
					console.log(koatonresult[1]);
				}
			} else {
				ae(expected, koatonresult, text);
			}
		}
	});
	yield mkdir(testdir);
	yield suite("koaton --help", function*(assert) {
		assert.expect(3);
		assert.equal(help, yield koaton([""]), "Renders help if not parameters");
		assert.equal(help, yield koaton(["-h"]), "Renders help -h");
		assert.equal(help, yield koaton(["--help"]), "Renders help --help");
	});
	yield suite("koaton new dummy", function*(assert) {
		const cachepath = path.join(path.resolve(), "/running_test/dummy/package.json");
		assert.equal(0, yield koaton(["new", "dummy", "-f"]), "Creates a new app");
		assert.ok(require("../running_test/dummy/package.json").dependencies.mongoose, "Mongoose is the database driver.");
		assert.ok(require("../running_test/dummy/package.json").dependencies.handlebars, "Handlebars is the template engine.");
		delete require.cache[cachepath];
		assert.equal(0, (yield koaton(["new", "dummy", "-fnb", "-d", "postgres"]))[0], "-d postgres");
		assert.ok(require("../running_test/dummy/package.json").dependencies.pg, "Postgres is the database driver.");
		delete require.cache[cachepath];

		assert.equal(0, (yield koaton(["new", "dummy", "-fnb", "-d", "sqlite3", "-e", "ejs"]))[0], "-d sqlite3 -e ejs");
		assert.ok(require("../running_test/dummy/package.json").dependencies.ejs, "EJS is the template engine.");
		delete require.cache[cachepath];

		// process.stdout.write("    Creates a new app and installs all dependencies (way take a while)".white);
		// assert.equal(0,(yield koaton(["new","dummy","-f"]))[0],"Creates a new app and isntalls all dependencies (way take a while)");
	});
	yield suite("koaton ember restapi", function*(assert) {
		prefix = "/dummy/";
		process.stdout.write("    Installs the app.".white);
		assert.equal(0, yield koaton(["ember", "restapi", "-nf"]), "Installs the app.");
		assert.equal("/", require("../running_test/dummy/config/ember.js").restapi.mount, "Mount the app on /");

		const def = require(`../running_test/dummy/config/server`);
		assert.equal(
			compile(yield read("./templates/ember_apps/adapter.js", {
				encoding: "utf-8"
			}), {
				localhost: def.host || 'localhost',
				port: def.port
			}),
			yield read("./running_test/dummy/ember/restapi/app/adapters/application.js", {
				encoding: "utf-8"
			})
			,
			"Creates the default adapter.");
		assert.equal("/", require("../running_test/dummy/ember/restapi/config/environment.js")().baseURL, "Mounted on the right path");
	});
	yield suite("koaton adapter <driver>", function*(assert) {
		const cachepath = path.join(path.resolve(), "/running_test/dummy/package.json");
		process.stdout.write("    Installing Couch Adapter (way take a while)".white);
		assert.equal(0, yield koaton(["adapter", "couchdb"]), "Installs CouchDb Adapter");

		delete require.cache[cachepath];
		assert.ok(require("../running_test/dummy/package.json").dependencies.couchdb, "pacakge.js is updated");

		delete require.cache[cachepath];
		assert.equal(0, yield koaton(["adapter", "riak", "-g"]), "Generates the Adapter structure for riak");
		assert.ok(require("../running_test/dummy/config/connections.js").riak, "Connections file is updated.");

		process.stdout.write("Installs a wrong adapter");
		assert.equal(1, yield koaton(["adapter", "postgress"]), "Installs a wrong adapter");

		const ccommand = yield koaton(["adapter", "couchdb",
			"-g",
			"--host", "192.168.0.1",
			"--port", "8080",
			"--user", "dummy",
			"--password", "pa$$w0rd",
			"--db", "awsome"
		]);
		assert.equal(0, ccommand[0], "Command with custom paramentes");
		delete require.cache[path.join(path.resolve(), "/running_test/dummy/config/connections.js")];
		const dbadapter = require("../running_test/dummy/config/connections.js").couchdb;
		assert.equal("192.168.0.1", dbadapter.host, "Host is ok");
		assert.equal(8080, dbadapter.port, "Port is ok");
		assert.equal("dummy", dbadapter.user, "User is ok");
		assert.equal("pa$$w0rd", dbadapter.password, "Password is secure");
		assert.equal("awsome", dbadapter.database, "Database is awsome");
	});
	yield suite("koaton model <name> <fields>", function*(assert) {
		let model = 'user';
		const testType = {
			type: undefined
		};
		assert.equal(0, yield koaton(['model', model, 'active:number name email password note:text created:date', '-e', 'restapi', '-fr']), "Run command with full arguments");
		const mdefinition = require(path.join(process.cwd(), "/running_test/dummy/models", `${model}.js`))({});
		assert.equal(testType, mdefinition.model.active, "active atribute added");
		assert.equal(testType, mdefinition.model.name, "name atribute added");
		assert.equal(testType, mdefinition.model.email, "email atribute added");
		assert.equal(testType, mdefinition.model.password, "password atribute added");
		assert.equal(testType, mdefinition.model.note, "note atribute added");
		assert.equal(testType, mdefinition.model.created, "created atribute added");
		let emberdef = yield read(path.join(process.cwd(), "/running_test/dummy/ember/restapi/app/models", `${model}.js`), {encoding: "utf-8"});
		// console.log(emberdef);JSON.parse()
		emberdef = emberdef.replace(/\n/igm,"").match(/{(.*)}/igm)[0].replace(/\t+/igm,"").replace(/\{|\}/igm,"").replace(/([^:]*):([^,]*),/g,"\"$1\":\"$1\",");
		emberdef=JSON.parse("{"+emberdef.substr(0,emberdef.length-1)+"}");
		const fields = ["active", "name", "email", "password", "note", "created"];
		for (let index in fields) {
			assert.ok(emberdef[fields[index]], `ember model constains ${fields[index]}`);
		}
		model = "consumer";
		assert.equal(0, yield koaton(['model', model, 'active:number name email password note:text created:date', '-fr']), "Creates models only on the Back End");
		//console.log(['koaton', 'model', model, '"active:number name email password note:text created:date"','-fr'].join(" "));
		const consumerdef = require(path.join(process.cwd(), "/running_test/dummy/models", `${model}.js`))({});
		assert.ok(consumerdef, "Model is created");
		assert.equal(false, exists(path.join(process.cwd(), "/running_test/dummy/ember/restapi/app/models", `${model}.js`)), "No ember models created.");

	});
	yield suite("koaton build <config_file>", function*(assert) {
		let res = yield koaton(["build"]);
		assert.equal(true, res[1].indexOf("Nothing to compile")>-1,"Nothing to compile");
	});
	// yield suite("koaton serve", function*(assert) {
	// 	assert.ok(false, "upps");
	// 	// prefix="dummy";
	// 	// assert.equal(0,yield koaton(["serve"]),"running server");
	// });
	yield suite("koaton forever", function*(assert) {
		assert.equal(0, yield koaton(["adapter", "mongoose"]), "Uses the mongoose adapter");
		let res = yield koaton(["forever"]);
		assert.ok(res[1].indexOf("dummy is running")>-1,"Things seems ok");
		res = yield koaton(["forever","-l"]);
		assert.ok(res[1].indexOf("koaton_dummy")>-1,"Process is runnig");
		yield koaton(["forever","-s"]);
		res = yield koaton(["forever","-l"]);
		assert.ok(res[1].indexOf("koaton_dummy")===-1,"Process has being stopped");
	});
}).then((a) => {
	process.exit(a);
}).catch((err) => {
	console.log(err.toString().red);
	// process.exit(1);
});
