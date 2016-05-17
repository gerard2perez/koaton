"use strict";
//process.stdout.write('clear');
//process.stdout.write('\e[3J');
//process.stdout.write('\x1Bc');
//process.stdout.write('clear');
process.stdout.write('\x1Bc');
const colors = require('colors');
const mkdir = require('../bin/utils').utils.mkdir;
const spawn = require('child_process').spawn;
const co = require("co");
const log = console.log.bind(console);
const Promise = require('bluebird');
const spinner = require('../bin/spinner');
const testdir = "running_test";
const commands = require('../bin/commands');
const pout = process.stdout.write.bind(process.stdout);

const koaton = Promise.promisify((command, cb) => {
	let buffer = "";
	let c = undefined;
	const child = spawn("koaton", command, {
		cwd: testdir,
		shell: true
	});
	//	child.stdout.pipe(process.stdout);
	//	spinner.start(50, "").then(() => {
	//		cb && cb(null, c || child.exitCode);
	//	}, (err) => {
	//		cb && cb(err, c || child.exitCode);
	//	});
	/*child.stderr.on('data', (data) => {
		console.log(data.toString());
	});*/
	child.stdout.on('data', (data) => {
		buffer += data.toString();
	});
	child.on('close', function (code, signal) {
		cb && cb(null, [c || child.exitCode, buffer.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "")]);
		//		c = code;
		//		const msg = code === 0 ? `✓`.green : `✗`.red;
		//		//`+ ${display}\t${msg}`.green
		//		spinner.end();
		//		console.log(buffer);
	});
});

let pass = 0;
let failed = 0;
let expected = -1;
let total = 0;
let srunned = 0;
let spassed = 0;
const expect = function (n) {
		expected = n;
	}
	//const suite = function* (test, tests) {
	//	srunned++;
	//	pass = 0;
	//	failed = 0;
	//	expected - 1;
	//	total = 0;
	//	log(test.cyan.bold);
	//	yield tests();
	//	console.log(`    ${total} test runned.`.gray);
	//	total = expected > -1 ? expected : total;
	//	if (total == pass) {
	//		spassed++;
	//		process.stdout.write(" ✓ ".green);
	//	} else {
	//		process.stdout.write(" ✗ ".red);
	//	}
	//	console.log(`${pass}/${total} passed.`.gray.bold);
	//}
const result = function (res, msg) {
	total++;
	if (res) {
		pass++;
		console.log("  ✓ ".green + msg);
	} else {
		failed++;
		console.log("  ✗ ".red + msf);
	}
}
let suites = [];
const suite = function* (SuitName, FnGenerator) {
	let t = new test();
	yield t.suite(SuitName, FnGenerator);
	suites.push(t);
}
const assert = function (expected, current, msg) {
	result(expected === current, msg);
}
class test {

	ok(msg, signal) {
		result(signal === 0, msg);
	}
	expect(n) {
		this.expected = n;
	}
	constructor() {
		this.pass = 0;
		this.failed = 0;
		this.expected = -1;
		this.total = 0;
		this.suite_result = false;
	} * suite(Name, TestGenerator) {
		log(Name.cyan.bold);
		yield TestGenerator();
		console.log(`    ${this.total} test runned.`.gray);
		this.total = this.expected > -1 ? this.expected : this.total;
		if (this.total == this.pass) {
			this.suite_result = true;
			process.stdout.write(" ✓ ".green);
		} else {
			process.stdout.write(" ✗ ".red);
		}
		console.log(`${this.pass}/${this.total} passed.`.gray.bold);
	}
}

co(function* () {
	yield mkdir(testdir);
	yield suite("Command help", function* () {
		expect(10);
		let help = commands[0](commands).replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/igm, "") + "\n";
		assert(help, (yield koaton([""]))[1], "Renders help if not parameters");
		assert(help, (yield koaton(["-h"]))[1], "Renders help -h");
		assert(help, (yield koaton(["--help"]))[1], "Renders help --help");
	});
	console.log();
	if (spassed === srunned) {
		console.log("All test suites passed.".green.bold);
	} else {
		console.log(`${spassed}/${srunned} test suites passed.`.red.bold);
	}
}).catch((e) => {
	console.log(e.toString().red);
});