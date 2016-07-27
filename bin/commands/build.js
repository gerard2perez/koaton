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
const compressImages = function(files,dest) {
	const imagemin = require('imagemin'),
		imageminMozjpeg = require('imagemin-mozjpeg'),
		imageminPngquant = require('imagemin-pngquant');
	return imagemin(files, dest, {
		plugins: [
			imageminMozjpeg({}),
			imageminPngquant({
				quality: '80-90'
			})
		]
	});
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
			watchinFiles[index + target] = readSync(file);
			if (development) {
				if (!onlypaths) {
					const concatCSS = new Concat(true, path.join("css", index + target + ".css"), '\n');
					for (const url in watchinFiles[index + target]) {
						concatCSS.add(target, fs.readFileSync(watchinFiles[index + target][url]));
					}
					yield utils.write(path.join("public", "css", index + target), concatCSS.content, 'utf-8', true);
				}
				koatonhide[target].push(`/css/${index+target}`);
			} else {
				const concatCSS = new Concat(true, path.join("css", basename), '\n');
				for (const url in watchinFiles[index + target]) {
					concatCSS.add(target, fs.readFileSync(watchinFiles[index + target][url]));
				}
				concat.add(basename, concatCSS.content);
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
const preBuildEmber = function*(ember_app, options) {
	const ember_proyect_path = path.join(process.cwd(), "ember", ember_app);
	const connections = require(`${process.cwd()}/config/connections`);
	const connection = require(`${process.cwd()}/config/models`).connection;
	const port = require(`${process.cwd()}/config/server`).port;
	const host = connections[connection].host;
	options.mount = path.join('/', options.mount || "");
	options.mount = options.mount.replace(/\\/igm, "/");
	const inflections = require(path.join(process.cwd(), "config", "inflections.js")),
		irregular = (inflections.plural || [])
		.concat(inflections.singular || [])
		.concat(inflections.irregular || []),
		uncontable = (inflections.uncountable || []).map((inflection) => {
			return `/${inflection}/`
		}),
		inflector = utils.Compile(yield utils.read(path.join(__dirname, "..", "templates", "ember_inflector"), {
			encoding: "utf-8"
		}), {
			irregular: JSON.stringify(irregular),
			uncontable: JSON.stringify(uncontable)

		});
	yield utils.mkdir(path.join(process.cwd(), "ember", ember_app, "app", "adapters"), -1);
	yield utils.write(path.join("ember", ember_app, "app", "initializers", "inflector.js"), inflector, null);
	yield utils.compile('ember_apps/adapter.js',
		path.join("ember", ember_app, "app", "adapters", "application.js"), {
			localhost: host,
			port: port
		}, null);
	let embercfg = yield utils.read(path.join(ember_proyect_path, "config", "environment.js"), {
		encoding: 'utf-8'
	});
	embercfg = embercfg.replace(/baseURL: ?'.*',/, `baseURL: '${options.mount}',`);
	yield utils.write(path.join(ember_proyect_path, "config", "environment.js"), embercfg, null);
}
const buildEmber = function*(app_name, options) {
	yield utils.mkdir(path.join(process.cwd(), "public", options.mount));
	return yield utils.shell(
		`Building ... ${app_name.yellow}->${options.mount.green}`, [
			"ember",
			"build",
			"--environment",
			options.build,
			"-o", path.join("..", "..", "public", options.mount)
		],
		path.join(process.cwd(), "ember", app_name)
	);
}
const postBuildEmber = function*(ember_app, options) {
	const mount_public = path.normalize(path.join(process.cwd(), "public", options.directory));
	const mount_views = path.normalize(path.join(process.cwd(), "views", "ember_apps", options.directory));
	if (options.build === "development") {
		let text = yield utils.read(path.join(mount_public, "index.html"), {
				encoding: 'utf-8'
			}),
			indextemplate = yield utils.read(path.join(__dirname, "..", "templates", "ember_indexapp"), 'utf-8'),
			meta = new RegExp(`<meta ?name="${ember_app}.*" ?content=".*" ?/>`);
		const links = new RegExp(`<link rel="stylesheet" href="assets/.*.css.*">`, "gm")
		const scripts = new RegExp(`<script src="assets/.*.js"></script>`, "gm")
		text = utils.Compile(indextemplate, {
			path: options.directory,
			mount: options.mount,
			app_name: ember_app,
			meta: text.match(meta)[0],
			cssfiles: text.match(links).join("\n").replace(/assets/igm, `/${ember_app}/assets`),
			jsfiles: text.match(scripts).join("\n").replace(/assets/igm, `/${ember_app}/assets`)
		});
		utils.mkdir(mount_views, -1);
		yield utils.write(path.join(mount_views, "index.handlebars"), text, true);
	}
}
module.exports = {
	compressImages:compressImages,
	postBuildEmber: postBuildEmber,
	preBuildEmber: preBuildEmber,
	buildEmber: buildEmber,
	buildCSS: buildCss,
	buildJS: buildJS,
	cmd: "build",
	description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
	args: ["config_file"],
	options: [
		["-p", "--prod", "builds for production"]
	],
	action: function*(config_file, options) {
		options.prod = options.prod ? "production" : "development";
		config_file = config_file || process.cwd() + '/config/bundles.js';
		const patterns = require(config_file);
		if (Object.keys(patterns).length === 0) {
			console.log("Nothing to compile on: " + config_file);
			return 0;
		}
		yield utils.mkdir(path.join(process.cwd(), "public", "js"), -1)
		yield utils.mkdir(path.join(process.cwd(), "public", "css"), -1)
		loadConfig();
		const clean = function(file) {
			utils.rmdir(path.join("public", path.normalize(file)));
		}
		for (let index in koatonhide) {
			if (koatonhide[index] instanceof Array) {
				koatonhide[index].forEach(clean);
			} else {
				utils.rmdir(path.join("public", path.normalize(koatonhide[index])));
				utils.rmdir(path.join("public", "css", index.replace(".css", ".css.map")));
			}
		}
		console.log(`Updating bundles (env: ${options.prod})`);
		for (var key in patterns) {
			if (key.indexOf(".css") > -1) {
				yield buildCss(key, patterns[key], !options.prod);
			} else if (key.indexOf(".js") > -1) {
				yield buildJS(key, patterns[key], !options.prod);
			}
		}
		const embercfg = require(`${process.cwd()}/config/ember`);
		for (const ember_app in embercfg) {
			yield preBuildEmber(ember_app, {
				directory: embercfg[ember_app].directory,
				mount: embercfg[ember_app].mount,
				build: "development"
			});
			yield buildEmber(ember_app, {
				mount: embercfg[ember_app].directory,
				build: options.prod
			});
			yield postBuildEmber(ember_app, {
				directory: embercfg[ember_app].directory,
				mount: embercfg[ember_app].mount,
				build: "development"
			});
		}
		process.stdout.write("Compressing Images");
		yield compressImages([path.join('assets', 'img', '*.{jpg,png}')], path.join('public', 'img'));
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		console.log("Images Compressed");

		return 0;
	}
};
