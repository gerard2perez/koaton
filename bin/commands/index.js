'use strict';
/*eslint global-require:0*/
const fs = require('fs');
const path = require('path');
let mods = [];

readDir(__dirname)
	.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item))
	.filter(item => item !== "index.js")
	.filter(item => item !== "help.js")
	.forEach((file) => {
		mods.push(require(path.join(__dirname, file)));
	});
module.exports=mods;
