"use strict";
//process.stdout.write('clear');
//process.stdout.write('\e[3J');
//process.stdout.write('\x1Bc');
//process.stdout.write('clear');
process.stdout.write('\x1Bc');
let prefix = "";
const colors = require('colors');
const path = require('path');
const mkdir = require('../bin/utils').utils.mkdir;
const spawn = require('cross-spawn-async');
const Promise = require('bluebird');
const spinner = require('../bin/spinner');
const testdir = "running_test";
const commands = require('../bin/commands');
const pout = process.stdout.write.bind(process.stdout);
const koaton = Promise.promisify((command, cb) => {
	let buffer = "";
	let c = undefined;
	const child = spawn("koaton", command, {
		cwd: testdir+prefix,
		shell: true
	});
	//	child.stdout.pipe(process.stdout);
	//	spinner.start(50, "").then(() => {
	//		cb && cb(null, c || child.exitCode);
	//	}, (err) => {
	//		cb && cb(err, c || child.exitCode);
	//	});
	child.stderr.on('data', (data) => {
		console.log(data.toString());
	});
	process.stdin.pipe(child.stdin);
	child.stdout.on('data', (data) => {
		buffer += data.toString();
		// console.log(data.toString());
	});
	child.on('close', function (code, signal) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		cb && cb(null, [c || child.exitCode, buffer.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "")]);
		//		c = code;
		//		const msg = code === 0 ? `✓`.green : `✗`.red;
		//		//`+ ${display}\t${msg}`.green
		//		spinner.end();
		//		console.log(buffer);
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
		assert.ok(false,"upps");
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
