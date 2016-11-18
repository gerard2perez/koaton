'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = loadmodules;

const path = require('path');

const fs = require('fs');

function loadmodules(dir) {
	let mods = {};
	fs.readdirSync(dir).filter(item => !/(^|\/)\.[^\/\.]/g.test(item)).filter(item => item !== "index.js").filter(item => item !== ".*.js").forEach(file => {
		console.log(file);
		let name = path.basename(file).replace(".js", "");
		let module = require(path.join(dir, name));
		mods[name] = module.default ? module.default : module;
	});
	mods[Symbol.iterator] = function () {
		let keys = Object.keys(this),
		    index = -1;
		return {
			next: () => ({
				value: this[keys[++index]],
				done: !(index < keys.length)
			})
		};
	};
	Object.defineProperty(mods, 'default', {
		enumerable: false,
		value: mods
	});
	return mods;
}