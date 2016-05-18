"use strict";
const co = require("co");
const colors = require('colors');
let suites = [];
class test_tools{
	constructor(){
		this.target = this;
	}
	expect(n){
		this.target.expected = n;
	}
	equal(expected, current, msg){
		this.result(expected === current, msg);
	}
	ok(signal,msg){
		this.result(signal ? true:false, msg);
	}
	model(t){
		this.target = t;
		return this;
	}
	result(res, msg) {
		this.target.total++;
		if (res) {
			this.target.pass++;
			console.log("  ✓ ".green + msg.white);
		} else {
			this.target.failed++;
			console.log("  ✗ ".red + msg.white);
		}
	}
}
const assert = new test_tools();
class test {
	constructor() {
		this.pass = 0;
		this.failed = 0;
		this.expected = -1;
		this.total = 0;
		this.suite_result = false;
	}
	*suite(Name, TestGenerator) {
		console.log(Name.cyan.bold);
		try {
			yield TestGenerator(assert.model(this));
		} catch (err) {
			console.log(err.toString().red);
		}
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
const suite = function* (SuitName, FnGenerator) {
		let t = new test();
		suites.push(t);
		yield t.suite(SuitName, FnGenerator);
		console.log();
}
module.exports = co.wrap(function*(tests){
		yield tests(suite);
		let passed=0;
		let result=true;
		let runned=0;
		suites.map((suite)=>{
			runned++;
			if(suite.suite_result){
				passed++;
			}
			result = result && suite.suite_result;
		});
		if (result) {
			console.log("All test suites passed.".green.bold);
		} else {
			console.log(`${passed}/${runned} test suites passed.`.red.bold);
		}
		return result ? 0:1;
});
