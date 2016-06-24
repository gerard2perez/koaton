'use strict';
const path = require('upath');
const crypto = require("crypto");
const fs = require("graceful-fs");
const Promise = require("Bluebird");
module.exports = {
	cmd: "build",
	description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
	args: ["config_file"],
	options: [
		["-p", "--prod", "builds for production"]
	],
	action: function*(config_file, options) {
		config_file = config_file || process.cwd() + '/config/bundles.js';
		const utils = require('../utils');
		const glob = require('glob');
		const uglify = require("uglify-js");
		const compressor = require("node-minify");
		var patterns = require(config_file);
		if (Object.keys(patterns).length === 0) {
			console.log("Nothing to compile on: " + config_file);
		}
		yield utils.mkdir(path.join(process.cwd(), "public", "js"));
		let AllFiles = [];
		let koatonhide = {};
		if (utils.canAccess(path.join(process.cwd(), ".koaton_bundle"))) {
			koatonhide = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".koaton_bundle")));
		}
		for (let index in koatonhide) {
			try {
				fs.unlinkSync(path.join("public", path.normalize(koatonhide[index])));
			} catch (e) {

			}
		}
		koatonhide={};
		for (var key in patterns) {
			AllFiles = [];
			for (var index in patterns[key]) {
				AllFiles = AllFiles.concat(glob.sync(path.normalize(patterns[key][index])));
			}
			const dest = key.split(".");
			if (key.indexOf(".js") > -1) {
				let result = uglify.minify(AllFiles, {
					outSourceMap: dest[0] + ".map",
					sourceRoot: "http://localhost:62626/js/"
				});
				var hasher = crypto.createHash('sha1');
				hasher.update(result.code);
				const hash = hasher.digest('hex').slice(0, 20);
				const desfile = dest[0] + "_" + hash;
				yield utils.write(path.join("public", "js", desfile + "." + dest[1]), result.code);
				yield utils.write(path.join("public", "js", dest[0] + ".map"), result.map);
				koatonhide[key] = "/js/" + desfile + "." + dest[1];
			} else {
				let minified = new compressor.minify({
					type: 'clean-css',
					fileIn: AllFiles,
					fileOut: 'public/css/' + dest[0] + ".min.css",
					sync: true
				});
				koatonhide[key] = "/css/" + dest[0] + ".min.css";
			}

		}
		yield utils.write(path.join(process.cwd(), ".koaton_bundle"), JSON.stringify(koatonhide));
		return 0;
	}
};
