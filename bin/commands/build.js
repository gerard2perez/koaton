'use strict';
const path = require('upath');
const crypto = require("crypto");
const fs = require("graceful-fs");
const utils = require('../utils');
const glob = require('glob');
const uglify = require("uglify-js");
const compressor = require("node-minify");
let koatonhide = {};
const loadConfig = function() {
	if (utils.canAccess(path.join(process.cwd(), ".koaton_bundle"))) {
		try {
			koatonhide = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".koaton_bundle")));
		} catch (err) {
			koatonhide = {};
		}
	}
}
const _rebuild = function(key, patterns, reload) {
	console.log(`Building ${key}`);
	const dest = key.split(".");
	if (reload !== false) {
		loadConfig();
	}
	let AllFiles = [];
	for (var index in patterns) {
		AllFiles = AllFiles.concat(glob.sync(path.normalize(patterns[index])));
	}

	if (key.indexOf(".js") > -1) {
		let result = uglify.minify(AllFiles, {
			outSourceMap: dest[0] + ".map",
			sourceRoot: "http://localhost:62626/js/"
		});
		var hasher = crypto.createHash('sha1');
		hasher.update(result.code);
		const hash = hasher.digest('hex').slice(0, 20);
		const desfile = dest[0] + "_" + hash;
		fs.writeFileSync(path.join("public", "js", desfile + "." + dest[1]), result.code, 'utf8');
		fs.writeFileSync(path.join("public", "js", dest[0] + ".map"), result.map, 'utf8');
		koatonhide[key] = "/js/" + desfile + "." + dest[1];
	} else {
		let minified = new compressor.minify({
			type: 'clean-css',
			fileIn: AllFiles,
			fileOut: path.join(process.cwd(), 'public', 'css', dest[0] + ".min.css"),
			sync: true
		});
		koatonhide[key] = "/css/" + dest[0] + ".min.css";
	}
	fs.writeFileSync(".koaton_bundle", JSON.stringify(koatonhide), 'utf8');
}
module.exports = {
	rebuild: _rebuild,
	cmd: "build",
	description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
	args: ["config_file"],
	options: [
		["-p", "--prod", "builds for production"]
	],
	action: function*(config_file, options) {
		config_file = config_file || process.cwd() + '/config/bundles.js';
		var patterns = require(config_file);
		if (Object.keys(patterns).length === 0) {
			console.log("Nothing to compile on: " + config_file);
		}
		yield utils.mkdir(path.join(process.cwd(), "public", "js"));
		loadConfig();
		for (let index in koatonhide) {
			try {
				fs.unlinkSync(path.join("public", path.normalize(koatonhide[index])));
			} catch (e) {

			}
		}
		for (var key in patterns) {
			try {
				_rebuild(key, patterns[key], false);
			} catch (e) {
				console.log(e);
			}
		}
		return 0;
	}
};
