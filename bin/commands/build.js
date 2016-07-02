'use strict';
const path = require('upath');
const crypto = require("crypto");
const fs = require("graceful-fs");
const utils = require('../utils');
const readSync = require('glob').sync;
const uglify = require("uglify-js");
const Promise = require('bluebird').promisify;
const Concat = require('concat-with-sourcemaps');

let koatonhide = {};
const hasFileName = function(file, content) {
	const basename = path.trimExt(file);
	const ext = file.replace(basename, "");
	const hasher = crypto.createHash('sha1');
	hasher.update(content);
	const hash = hasher.digest('hex').slice(0, 20);
	return basename + "_" + hash + ext;
}
const buildCss = function*(target, source, development, onlypaths) {
	const less = require('less'),
		sass = Promise(require('node-sass').render),
		CssImporter = require('node-sass-css-importer')(),
		concat = new Concat(true, path.join("css", target + ".map"), '\n'),
		LessPluginCleanCSS = require('less-plugin-clean-css'),
		cleanCSSPlugin = new LessPluginCleanCSS({
			advanced: true
		}),
		watchinFiles = [];
	koatonhide[target] = [];
	for (let index in source) {
		if (!development) {
			utils.rmdir(path.join("public", "css", index + target));
		}
		let file = path.normalize(source[index]),
			basename = path.basename(file);
		if (file.indexOf(".less") > -1) {
			let content = yield less.render(fs.readFileSync(file, 'utf-8'), {
				plugins: [cleanCSSPlugin],
				filename: file,
				compres: true,
				sourceMap: onlypaths ? {} : {
					outputSourceFiles: true,
					sourceMapBasepath: path.normalize(file.replace(basename, "")),
					sourceMapFileInline: development,
					sourceMapRootpath: "/" + basename
				}
			});
			if (development) {
				watchinFiles[index + target] = content.imports;
				if (!onlypaths) {
					yield utils.write(path.join("public", "css", index + target), content.css.toString(), 'utf-8', true);
				}
				koatonhide[target].push(`/css/${index+target}`);
			} else {
				concat.add(basename, content.css, concat.map);
			}
		} else if (file.indexOf(".scss") > -1 || file.indexOf(".sass") > -1) {
			let content = yield sass({
				sourceMap: onlypaths ? false : "/",
				sourceMapRoot: onlypaths ? undefined : "/" + target + "/",
				sourceMapContents: onlypaths ? undefined : true,
				sourceMapEmbed: onlypaths ? undefined : development,
				outputStyle: "compressed",
				file: file,
				importer: [CssImporter]
			});
			if (development) {
				watchinFiles[index + target] = content.stats.includedFiles;
				if (!onlypaths) {
					yield utils.write(path.join("public", "css", index + target), content.css.toString(), 'utf-8', true);
				}
				koatonhide[target].push(`/css/${index+target}`);
			} else {
				concat.add(basename, content.css, concat.map);
			}
		} else if (file.indexOf(".css")) {
			if (development) {
				watchinFiles[index + target] = file;
				if (!onlypaths) {
					yield utils.write(path.join("public", "css", index + target), fs.readFileSync(file, 'utf-8'), 'utf-8', true);
				}
				koatonhide[target].push(`/css/${index+target}`);
			} else {
				concat.add(basename, content.css, concat.map);
			}
		}
	}
	if (!onlypaths) {
		if (!development) {
			const file = hasFileName(target, concat.content.toString());
			yield utils.write(
				path.join("public", "css", file),
				concat.content.toString(),
				'utf-8', true);
			koatonhide[target] = `/css/${file}`;
		}
		fs.writeFileSync(".koaton_bundle", JSON.stringify(koatonhide), 'utf8');
	}
	return watchinFiles;
}
const buildJS = function*(target, source, development, onlypaths) {
	let AllFiles = [];
	for (var index in source) {
		AllFiles = AllFiles.concat(readSync(path.normalize(source[index])));
	}
	if (onlypaths) {
		return AllFiles;
	}
	let result = uglify.minify(AllFiles, {
		outSourceMap: onlypaths ? false : " /js/" + target + ".map",
		sourceMapIncludeSources: onlypaths ? false : development,
		sourceRoot: "/" + target,
		compress: {
			dead_code: true,
			sequences: true,
			unused: true
		}
	});
	if (!onlypaths) {
		const file = hasFileName(target, result.code.toString());
		yield utils.write(path.join("public", "js", file), result.code, {
			encoding: 'utf-8'
		}, true);
		if (development) {
			fs.writeFileSync(path.join("public", "js", target + ".map"), result.map, 'utf8');
		}

		koatonhide[target] = "/js/" + file;
		fs.writeFileSync(".koaton_bundle", JSON.stringify(koatonhide), 'utf8');
	}
	return AllFiles;
}
const loadConfig = function() {
	if (utils.canAccess(path.join(process.cwd(), ".koaton_bundle"))) {
		try {
			koatonhide = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".koaton_bundle")));
		} catch (err) {
			koatonhide = {};
		}
	}
}

module.exports = {
	buildCSS: buildCss,
	buildJS: buildJS,
	cmd: "build",
	description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
	args: ["config_file"],
	options: [
		["-p", "--prod", "builds for production"]
	],
	action: function*(config_file, options) {
		config_file = config_file || process.cwd() + '/config/bundles.js';
		const patterns = require(config_file);
		if (Object.keys(patterns).length === 0) {
			console.log("Nothing to compile on: " + config_file);
		}
		yield utils.mkdir(path.join(process.cwd(), "public", "js"));
		loadConfig();
		for (let index in koatonhide) {
			if (koatonhide[index] instanceof Array) {
				koatonhide[index].forEach((file) => {
					utils.rmdir(path.join("public", path.normalize(file)));
				});
			} else {
				utils.rmdir(path.join("public", path.normalize(koatonhide[index])));
				utils.rmdir(path.join("public", "css", index.replace(".css", ".css.map")));
			}
		}
		for (var key in patterns) {
			if (key.indexOf(".css") > -1) {
				yield buildCss(key, patterns[key], !options.prod);
			} else if (key.indexOf(".js") > -1) {
				yield buildJS(key, patterns[key], !options.prod);
			}
		}
		return 0;
	}
};
