'use strict';
const path = require('upath');
const crypto = require("crypto");
const fs = require("graceful-fs");
const utils = require('../utils');
const readSync = require('glob').sync;
const uglify = require("uglify-js");
const compressor = require("node-minify");
const Promise = require('bluebird').promisify;
const Concat = require('concat-with-sourcemaps');

let koatonhide = {};
const buildCss = function*(target, source) {
	console.log("Start building",target,"---------------------------------------");
	const less = require('less');
	const sass = Promise(require('node-sass').render);
	const CssImporter = require('node-sass-css-importer')();
	console.log(target+".map");
	const concat = new Concat(true,path.join("css",target+".map"),'\n');

	koatonhide[target]=[];
	for (let index in source) {
		let file = path.normalize(source[index]);
		let basename = path.basename(file);
		if (file.indexOf(".less") > -1) {
			let content = fs.readFileSync(file, 'utf-8');
			content = yield less.render(content, {
				filename: file,
				sourceMap: {
					outputSourceFiles: true,
					sourceMapBasepath: path.normalize(file.replace(basename, "")),
					sourceMapFileInline: true,
					sourceMapRootpath: "/" + basename
				}
			});
			// concat.add(basename,content.css,content.map);
			// concat.add(basename,content.css);

			// console.log(content.css);
			// var hasher = crypto.createHash('sha1');
			// hasher.update(content.css);
			// const hash = hasher.digest('hex').slice(0, 20);
			// file = target.replace(".css", `_${hash}.css`);
			// yield utils.write(path.join("public", "css", file), content.css, 'utf-8', true);
			yield utils.write(path.join("public", "css", index+target), content.css.toString(), 'utf-8', true);
			// yield utils.write(path.join("public", "css", target+".map"), content.map, 'utf-8', true);
			koatonhide[target].push(`/css/${index+target}`);

			// let encoded = (new Buffer(content.map)).toString('base64');
			// encoded = `\n/*# sourceMappingURL=data:application/json;base64,${encoded} */`;
			// concat.add(basename,content.css.toString()+encoded,content.map);

		} else if (file.indexOf(".scss") > -1 || file.indexOf(".sass") > -1) {
			let content = fs.readFileSync(file, 'utf-8');
			content = yield sass({
				sourceMap: "/",
				sourceMapRoot:"/"+target+"/",
				sourceMapContents: true,
				// omitSourceMapUrl:true,
				sourceMapEmbed: true,
				file: file,
				importer:[CssImporter]
				// ,outFile: "/public/css/"+target+".map"
			});
			// let rrr= (new RegExp("/*# .*,([^ ]*).*/")).exec(content.css.toString());
			// let buf = new Buffer(rrr[1], 'base64');
			// console.log(rrr[rrr.length-3],rrr[rrr.length-1]);
			// concat.add(basename,content.css.toString().replace(rrr[0],"")+"# sourceMappingURL=css/flatadmin.css.map */",buf);
			// concat.add(basename,content.css,concat.map);
			// yield utils.write(path.join("public", "css", target), content.css, 'utf-8', true);

			// console.log(content.map.toString('base64'));
			// let encoded = (new Buffer(concat.map.toString())).toString('base64');

			// let encoded = content.map.toString('base64');
			// encoded = `\n/*# sourceMappingURL=data:application/json;base64,${encoded} */`;
			// concat.add(basename,content.css+encoded,concat.map);
			yield utils.write(path.join("public", "css", index+target), content.css.toString(), 'utf-8', true);
			// concat.add(basename,content.css,concat.map);
			koatonhide[target].push(`/css/${index+target}`);
		}
	}
	let encoded = (new Buffer(concat.sourceMap.toString())).toString('base64');
	encoded = `\n/*# sourceMappingURL=data:application/json;base64,${encoded} */`;
	// concat.add(basename,content.css+encoded,concat.map);
	// yield utils.write(
	// 	path.join("public", "css", target),
	// 	concat.content.toString()+encoded,// +"/*# sourceMappingURL=/css/flatadmin.css.map */",
	// 	'utf-8', true);
	// yield utils.write(path.join("public", "css", target+".map"), concat.sourceMap, 'utf-8', true);
	// koatonhide[target] = `/css/${target}`;
	fs.writeFileSync(".koaton_bundle", JSON.stringify(koatonhide), 'utf8');
}

const buildCss2 = function*(target, source) {
	console.log("Start building",target,"---------------------------------------");
	const less = require('less');
	const sass = Promise(require('node-sass').render);
	const CssImporter = require('node-sass-css-importer')();
	console.log(target+".map");
	const concat = new Concat(true,path.join("css",target+".map"),'\n');
	for (let index in source) {
		let file = path.normalize(source[index]);
		let basename = path.basename(file);
		if (file.indexOf(".less") > -1) {
			let content = fs.readFileSync(file, 'utf-8');
			content = yield less.render(content, {
				filename: file,
				sourceMap: {
					outputSourceFiles: true,
					sourceMapBasepath: path.normalize(file.replace(basename, "")),
					// sourceMapFileInline: true,
					sourceMapRootpath: "/" + basename
				}
			});

			// concat.add(basename,content.css,content.map);
			concat.add(basename,content.css);

			// console.log(content.css);
			// var hasher = crypto.createHash('sha1');
			// hasher.update(content.css);
			// const hash = hasher.digest('hex').slice(0, 20);
			// file = target.replace(".css", `_${hash}.css`);
			// yield utils.write(path.join("public", "css", file), content.css, 'utf-8', true);
			// yield utils.write(path.join("public", "css", target), content.css.toString()+"/*# sourceMappingURL=/css/flatadmin.css.map */", 'utf-8', true);
			// yield utils.write(path.join("public", "css", target+".map"), content.map, 'utf-8', true);


			// let encoded = (new Buffer(content.map)).toString('base64');
			// encoded = `\n/*# sourceMappingURL=data:application/json;base64,${encoded} */`;
			// concat.add(basename,content.css.toString()+encoded,content.map);

		} else if (file.indexOf(".scss") > -1 || file.indexOf(".sass") > -1) {
			let content = fs.readFileSync(file, 'utf-8');
			content = yield sass({
				sourceMap: "/",
				sourceMapRoot:"/"+target+"/",
				sourceMapContents: true,
				omitSourceMapUrl:true,
				// sourceMapEmbed: true,
				file: file,
				importer:[CssImporter]
				// ,outFile: "/public/css/"+target+".map"
			});
			// let rrr= (new RegExp("/*# .*,([^ ]*).*/")).exec(content.css.toString());
			// let buf = new Buffer(rrr[1], 'base64');
			// console.log(rrr[rrr.length-3],rrr[rrr.length-1]);
			// concat.add(basename,content.css.toString().replace(rrr[0],"")+"# sourceMappingURL=css/flatadmin.css.map */",buf);
			// concat.add(basename,content.css,concat.map);
			// yield utils.write(path.join("public", "css", target), content.css, 'utf-8', true);

			// console.log(content.map.toString('base64'));
			// let encoded = (new Buffer(concat.map.toString())).toString('base64');

			// let encoded = content.map.toString('base64');
			// encoded = `\n/*# sourceMappingURL=data:application/json;base64,${encoded} */`;
			// concat.add(basename,content.css+encoded,concat.map);

			concat.add(basename,content.css,concat.map);
		}
	}
	let encoded = (new Buffer(concat.sourceMap.toString())).toString('base64');
	encoded = `\n/*# sourceMappingURL=data:application/json;base64,${encoded} */`;
	// concat.add(basename,content.css+encoded,concat.map);
	yield utils.write(
		path.join("public", "css", target),
		concat.content.toString()+encoded,// +"/*# sourceMappingURL=/css/flatadmin.css.map */",
		'utf-8', true);
	// yield utils.write(path.join("public", "css", target+".map"), concat.sourceMap, 'utf-8', true);
	koatonhide[target] = `/css/${target}`;
	fs.writeFileSync(".koaton_bundle", JSON.stringify(koatonhide), 'utf8');
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
const _rebuild = function(key, patterns, reload) {
	console.log(`Making bundle ${key}`);
	const dest = key.split(".");
	if (reload !== false) {
		loadConfig();
	}
	let AllFiles = [];
	for (var index in patterns) {
		AllFiles = AllFiles.concat(readSync(path.normalize(patterns[index])));
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
				// console.log(e);
			}
		}
		for (var key in patterns) {
			if (key.indexOf(".css") > -1) {
				yield buildCss(key, patterns[key]);
			}
			// 	try {
			// 		_rebuild(key, patterns[key], false);
			// 	} catch (e) {
			// 		console.log(e);
			// 	}
		}
		return 0;
	}
};
