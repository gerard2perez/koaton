"use strict";
/*eslint global-require:0*/
//process.stdout.write('clear');
//process.stdout.write('\e[3J');
//process.stdout.write('\x1Bc');
//process.stdout.write('clear');
require('../lib/scfg');
process.stdout.write('\x1Bc');
let prefix = "";
const path = require('path');
const mkdir = require('../bin/utils').mkdir;
const read = require('../bin/utils').read;
const fs = require('graceful-fs');
const compile = require('../bin/utils').Compile;
const shell = require('../bin/utils').shell;
const exec = require('../bin/utils').exec;
const spawn = require('cross-spawn');
const Promise = require('bluebird');
const exists = require("fs").existsSync;
require('colors');
const testdir = "running_test";
const koaton = Promise.promisify((command, cb) => {
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

const addtoBundle = (data) => {
	let bundle = {};
	if (exists(path.join(process.cwd(), testdir, prefix, "config","bundles.js"))) {
		bundle = require(path.join(process.cwd(), testdir, prefix, "config","bundles.js"));
	}
	for (const file in data) {
		bundle[file] = data[file];
	}
	fs.writeFileSync(path.join(process.cwd(), testdir, prefix, "config","bundles.js"), `module.exports =${JSON.stringify(bundle)} ;`, 'utf8');

}
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
	yield mkdir(testdir, -1);
	yield suite("koaton --help", function*(assert) {
		assert.expect(3);
		assert.equal(help, yield koaton([""]), "Renders help if not parameters");
		assert.equal(help, yield koaton(["-h"]), "Renders help -h");
		assert.equal(help, yield koaton(["--help"]), "Renders help --help");
	});
	yield suite("koaton new dummy", function*(assert) {
		const cachepath = path.join(process.cwd(), "/running_test/dummy/package.json");
		assert.equal(0, yield koaton(["new", "dummy", "-f"]), "Creates a new app");
		assert.ok(require(cachepath).dependencies.mongoose, "Mongoose is the database driver.");
		assert.ok(require(cachepath).dependencies.handlebars, "Handlebars is the template engine.");
		delete require.cache[cachepath];
		assert.equal(0, (yield koaton(["new", "dummy", "-fnb", "-d", "postgres"]))[0], "-d postgres");
		assert.ok(require(cachepath).dependencies.pg, "Postgres is the database driver.");
		delete require.cache[cachepath];
		assert.equal(0, (yield koaton(["new", "dummy", "-fnb", "-d", "sqlite3", "-e", "ejs"]))[0], "-d sqlite3 -e ejs");
		assert.ok(require(cachepath).dependencies.ejs, "EJS is the template engine.");
		delete require.cache[cachepath];
	});
	yield suite("koaton ember restapi", function*(assert) {
		prefix = "/dummy/";
		process.stdout.write("    Installs the app.".white);
		let res = yield koaton(["ember", "restapi", "-nf"]);
		assert.equal(0, res[0], "Installs the app.");
		assert.equal("/", require("../running_test/dummy/config/ember.js").restapi.mount, "Mount the app on /");
		const def = require(`../running_test/dummy/config/server`);
		assert.equal(
			compile(yield read("./templates/ember_apps/adapter.js", {
				encoding: "utf-8"
			}), {
				localhost: def.host || 'localhost',
				port: def.port
			}),
			yield read(path.join(process.cwd(),"/running_test/dummy/ember/restapi/app/adapters/application.js"), {
				encoding: "utf-8"
			}),
			"Creates the default adapter.");
		const enviroment = require(path.join(process.cwd(),"/running_test/dummy/ember/restapi/config/environment.js"))();
		assert.equal("/", enviroment.baseURL || enviroment.rootURL, "Mounted on the right path");
	});
	yield suite("koaton adapter <driver>", function*(assert) {
		const cachepath = path.join(process.cwd(), "/running_test/dummy/package.json");
		process.stdout.write("    Installing Couch Adapter (may take a while)".white);
		assert.equal(0, yield koaton(["adapter", "couchdb"]), "Installs CouchDb Adapter");
		delete require.cache[cachepath];
		assert.ok(require(cachepath).dependencies.couchdb, "pacakge.js is updated");
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
		delete require.cache[path.join(process.cwd(), "/running_test/dummy/config/connections.js")];
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
		let emberdef = yield read(path.join(process.cwd(), "/running_test/dummy/ember/restapi/app/models", `${model}.js`), {
			encoding: "utf-8"
		});
		// console.log(emberdef);JSON.parse()
		emberdef = emberdef.replace(/\n/igm, "").match(/{(.*)}/igm)[0].replace(/\t+/igm, "").replace(/\{|\}/igm, "").replace(/([^:]*):([^,]*),/g, "\"$1\":\"$1\",");
		emberdef = JSON.parse("{" + emberdef.substr(0, emberdef.length - 1) + "}");
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
		yield mkdir(path.join(process.cwd(),testdir,prefix,"public","css"), -1);
		yield mkdir(path.join(process.cwd(),testdir,prefix,"public","js"), -1);
		let res = yield koaton(["build"]);
		assert.equal(true, res[1].indexOf("Nothing to compile") > -1, "Nothing to compile");
		yield shell("Getting flatadmin", ["git", "clone", "https://github.com/gerard2p/koatonstyle.git", "assets/flatadmin"], path.join(process.cwd(), testdir, prefix));
		//console.log(shell_log());
		addtoBundle({
			"admin.css": [
				"./assets/flatadmin/css/**/*.css"
			],
			"admin.js": [
				"./assets/flatadmin/js/jquery.min.js",
				"./assets/flatadmin/js/bootstrap.min.js",
				"./assets/flatadmin/js/Chart.min.js",
				"./assets/flatadmin/js/bootstrap-switch.min.js",
				"./assets/flatadmin/js/jquery.matchHeight-min.js",
				"./assets/flatadmin/js/jquery.dataTables.min.js",
				"./assets/flatadmin/js/dataTables.bootstrap.min.js",
				"./assets/flatadmin/js/select2.full.min.js",
				"./assets/flatadmin/js/ace/ace.js",
				"./assets/flatadmin/js/ace/mode-html.js",
				"./assets/flatadmin/js/ace/theme-github.js",
				"./assets/flatadmin/js/app.js",
				"./assets/flatadmin/js/index.js"
			]
		});
		let csscount = fs.readdirSync(path.join(process.cwd(),testdir,prefix,"public","css")).length;
		let jscount = fs.readdirSync(path.join(process.cwd(),testdir,prefix,"public","js")).length;
		res = yield koaton(["build"]);
		let csscount2 = fs.readdirSync(path.join(process.cwd(),testdir,prefix,"public","css")).length;
		let jscount2 = fs.readdirSync(path.join(process.cwd(),testdir,prefix,"public","js")).length;
		assert.equal(csscount, csscount2-1, "CSS Bundle was created.");
		assert.equal(jscount, jscount2-1, "JS Bundle was created.");
	});
	yield suite("koaton forever", function*(assert) {
		assert.equal(0, yield koaton(["adapter", "mongoose"]), "Uses the mongoose adapter");
		let res = yield koaton(["forever"]);
		assert.ok(res[1].indexOf("dummy is running") > -1, "Things seems ok");
		res = yield koaton(["forever", "-l"]);
		assert.ok(res[1].indexOf("koaton_dummy") > -1, "Process is runnig");
		yield koaton(["forever", "-s"]);
		res = yield koaton(["forever", "-l"]);
		assert.ok(res[1].indexOf("koaton_dummy") === -1, "Process has being stopped");
	});

	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"public"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"views"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"routes"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"controllers"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"models"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"assets","css"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"assets","img"));
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"assets","js"));
	try{
		fs.unlinkSync(path.join(process.cwd(),testdir,prefix,".gitignore"));
		fs.unlinkSync(path.join(process.cwd(),testdir,prefix,".koaton"));
		fs.unlinkSync(path.join(process.cwd(),testdir,prefix,"app.js"));
		fs.unlinkSync(path.join(process.cwd(),testdir,prefix,"bower.json"));
		fs.unlinkSync(path.join(process.cwd(),testdir,prefix,"package.json"));
		require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"assets"));
	}catch(e){
		(()=>{})(e);
	}
	require('../bin/utils').deleteFolderRecursive(path.join(process.cwd(),testdir,prefix,"config"));
}).then((a) => {
	process.exit(a);
}).catch((err) => {
	console.log(err.stack.red);
	process.exit(1);
});
