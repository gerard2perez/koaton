"use strict";
const co = require("co");
require('colors');
let suites = [];
class test_tools{

	compare(a,b){
		let equals = true;
		switch (typeof(a)) {
			case "boolean":
			return (b ? true:false)===a;
			case "string":
			case "number":
					return a===b;
			case "object":
				Object.keys(a).forEach((key)=>{
					if(a[key]!==b[key]){
						equals=false;
					}
				});
			return equals;
			default:
				return false;

		}
	}
	constructor(){
		this.target = this;
	}
	expect(n){
		this.target.expected = n;
	}
	equal(expected, current, msg){
		return this.result(current,expected, msg);
	}
	ok(signal,msg){
		return this.result(signal,true, msg);
	}
	model(t){
		this.target = t;
		return this;
	}
	result(current,expected, msg) {
		this.target.total++;
		if (this.compare(expected,current)) {
			this.target.pass++;
			console.log("  ✓ ".green + msg.white);
			return true;
		} else {
			this.target.failed++;
			console.log("  ✗ ".red + msg.white);
			console.log(`\tValue expected:`);
			process.stdout.write("\t");
			console.log(expected);
			console.log(`\tValue received:`);
			process.stdout.write("\t");
			console.log(current);
			return false;
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
		if(typeof(Name)==="object"){
			Object.keys(Name).forEach((key)=>{
				const old = assert[key].bind(assert);
				assert[key]=function (){
					var slicedArgs = Array.prototype.slice.call(arguments, 0)
					slicedArgs.push(old);
					Name[key].apply(old,slicedArgs);
				};
			});
			return this;
		}
		console.log(Name.cyan.bold);
		try {
			yield TestGenerator(assert.model(this));
		} catch (err) {
			console.log(err.stack);
		}
		console.log(`    ${this.total} test runned.`.gray);
		this.total = this.expected > -1 ? this.expected : this.total;
		if (this.total === this.pass) {
			this.suite_result = true;
			process.stdout.write(" ✓ ".green);
		} else {
			process.stdout.write(" ✗ ".red);
		}
		console.log(`${this.pass}/${this.total} passed.`.gray.bold);
		return this;
	}
}
const suite = function* (SuitName, FnGenerator) {
		let t = new test();
		if(FnGenerator!==undefined){suites.push(t);}
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
