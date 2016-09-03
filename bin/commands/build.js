'use strict';
const path = require('upath');
const crypto = require("crypto");
const fs = require("graceful-fs");
const utils = require('../utils');
const readSync = require('glob').sync;
const uglify = require("uglify-js");
const Promise = require('bluebird').promisify;
const Concat = require('concat-with-sourcemaps');
const copystatic = function*() {
	const copy = require(ProyPath("config", "copy"));
	for (const dir in copy) {
		yield utils.mkdir(ProyPath("public", dir), -1);
		for (const idx in copy[dir]) {
			let directories = readSync(ProyPath(copy[dir][idx]));
			for (const i in directories) {
				const file = directories[i];
				yield utils.Copy(file, ProyPath("public", dir, path.basename(file)));
			}
		}
	}
}
const hasFileName = function(file, content) {
	const basename = path.trimExt(file);
	const ext = file.replace(basename, "");
	const hasher = crypto.createHash('sha1');
	hasher.update(content);
	const hash = hasher.digest('hex').slice(0, 20);
	return basename + "_" + hash + ext;
}
const compressImages = function(files, dest) {
	const imagemin = require('imagemin'),
		imageminMozjpeg = require('imagemin-mozjpeg'),
		imageminPngquant = require('imagemin-pngquant');
	return imagemin(files, dest, {
		plugins: [
			imageminMozjpeg({}),
			imageminPngquant({
				quality: '70-90',
				verbose: true
			})
		]
	});
}
const buildCss = function*(target, source, development, onlypaths, logger) {
	if (!Kmetadata.bundles[target]) {
		Kmetadata.bundles[target] = [];
	}
	while (Kmetadata.bundles[target] instanceof Array && Kmetadata.bundles[target].length > 0) {
		Kmetadata.bundles[target].pop();
	}
	utils.writeuseslog = logger;
	const less = require('less'),
		sass = Promise(require('node-sass').render),
		CssImporter = require('node-sass-css-importer')(),
		concat = new Concat(true, path.join("css", target + ".map"), '\n'),
		LessPluginCleanCSS = require('less-plugin-clean-css'),
		cleanCSSPlugin = new LessPluginCleanCSS({
			advanced: true
		}),
		watchinFiles = [];
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
				watchinFiles[index + target].push(file);
				if (!onlypaths) {
					utils.writeSync(path.join("public", "css", index + target), content.css.toString(), 'utf-8', true);
				}
				Kmetadata.bundles[target].push(`/css/${index+target}`);
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
					utils.writeSync(path.join("public", "css", index + target), content.css.toString(), 'utf-8', true);
				}
				Kmetadata.bundles[target].push(`/css/${index+target}`);
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
					utils.writeSync(ProyPath("public", "css", index + target), concatCSS.content, 'utf-8', true);
					Kmetadata.bundles[target].push(`/css/${index+target}`);
				}
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
			utils.writeSync(
				path.join("public", "css", file),
				concat.content.toString(), 'utf-8', true);
			Kmetadata.bundles[target] = `/css/${file}`;
		}
	}
	utils.writeuseslog = undefined;
	return watchinFiles;
}
const buildJS = function*(target, source, development, onlypaths, logger) {
	console.log("buildJS");
	utils.writeuseslog = logger;
	let AllFiles = [];
	for (var index in source) {
		AllFiles = AllFiles.concat(readSync(path.join(process.cwd(), path.normalize(source[index]))));
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
		const file = development ? target : hasFileName(target, result.code.toString());
		utils.writeSync(path.join("public", "js", file), result.code, {
			encoding: 'utf-8'
		}, true);
		if (development) {
			fs.writeFileSync(path.join("public", "js", target + ".map"), result.map, 'utf8');
		}

		Kmetadata.bundles[target] = "/js/" + file;
	}
	utils.writeuseslog = undefined;
	return AllFiles;
}
const getInflections = function*(app_name, cfg) {
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
	utils.writeSync(path.join("ember", app_name, "app", "initializers", "inflector.js"), inflector, cfg);
}
const preBuildEmber = function*(ember_app, options) {
	const ember_proyect_path = ProyPath("ember", ember_app);
	options.mount = path.join('/', options.mount || "", "/");
	options.mount = options.mount.replace(/\\/igm, "/");
	yield utils.mkdir(ProyPath("ember", ember_app, "app", "adapters"), -1);
	yield getInflections(ember_app, null);
	let adapter = require(ProyPath("config", "ember"))[ember_app].adapter;
	if (adapter.indexOf("http://") !== 0) {
		adapter = "http://" + adapter;
	}
	yield utils.compile('ember_apps/adapter.js',
		path.join("ember", ember_app, "app", "adapters", "application.js"), {
			adapter: adapter
		}, null);
	let embercfg = yield utils.read(path.join(ember_proyect_path, "config", "environment.js"), {
		encoding: 'utf-8'
	});
	embercfg = embercfg.replace(/baseURL: ?'.*',/, `baseURL: '${options.mount}',`);
	embercfg = embercfg.replace(/rootURL: ?'.*',/, `rootURL: '${options.mount}',`);
	utils.writeSync(path.join(ember_proyect_path, "config", "environment.js"), embercfg, null);
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
	const emberinternalname = require(ProyPath("ember", ember_app, "package.json" /*path.join(process.cwd(), "ember", ember_app,"package.json"*/ )).name;
	//if (scfg.isDev) {
		let text = yield utils.read(ProyPath("public", ember_app, "index.html"), {
				encoding: 'utf-8'
			}),
			indextemplate = yield utils.read(BinPath("templates", "ember_indexapp"), 'utf-8'),
			meta = new RegExp(`<meta ?name="${emberinternalname}.*" ?content=".*" ?/>`);

		const links = new RegExp(`<link rel="stylesheet" href=".*?assets/.*.css.*>`, "gm");
		const scripts = new RegExp(`<script src=".*?assets/.*.js.*></script>`, "gm");
		text = utils.Compile(indextemplate, {
			layout: options.layout || "main",
			path: options.directory,
			mount: options.mount,
			app_name: ember_app,
			meta: text.match(meta)[0],
			cssfiles: text.match(links).join("\n").replace(/href=".*?assets/igm, `href="/${ember_app}/assets`).replace(new RegExp(ember_app + "/", "gm"), options.directory + "/"),
			jsfiles: text.match(scripts).join("\n").replace(/src=".*?assets/igm, `src="/${ember_app}/assets`).replace(new RegExp(ember_app + "/", "gm"), options.directory + "/")
		});
		utils.mkdir(ProyPath("views","ember_apps"), -1);
		utils.writeSync(ProyPath("views","ember_apps",`${ember_app}.handlebars`), text, true);
	//}
}
const clean = function(file) {
	utils.rmdir(path.join("public", path.normalize(file)));
}
module.exports = {
	copystatic: copystatic,
	getInflections: getInflections,
	compressImages: compressImages,
	postBuildEmber: postBuildEmber,
	preBuildEmber: preBuildEmber,
	buildEmber: buildEmber,
	buildCSS: buildCss,
	buildJS: buildJS,
	cmd: "build",
	description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
	args: ["config_file"],
	options: [
		["-p", "--prod", "builds for production"],
		["--port", "--port <port>", "port to build"]
	],
	action: function*(config_file, options) {
		options.prod = options.prod ? "production" : "development";
		process.env.NODE_ENV = options.prod;
		config_file = config_file || process.cwd() + '/config/bundles.js';
		const patterns = require(config_file);
		yield utils.Copy(path.join('assets', 'favicon.ico'), path.join('public', 'favicon.ico'), {
			encoding: "binary"
		});
		if (Object.keys(patterns).length === 0) {
			console.log("Nothing to compile on: " + config_file);
		} else {
			yield utils.mkdir(path.join(process.cwd(), "public", "js"), -1)
			yield utils.mkdir(path.join(process.cwd(), "public", "css"), -1)
			for (let index in Kmetadata.bundles) {
				if (Kmetadata.bundles[index] instanceof Array) {
					Kmetadata.bundles[index].forEach(clean);
				} else {
					utils.rmdir(path.join("public", path.normalize(Kmetadata.bundles[index])));
					utils.rmdir(path.join("public", "css", index.replace(".css", ".css.map")));
				}
			}
			console.log(`Updating bundles (env: ${scfg.env})`);
			for (const key in patterns) {
				if (key.indexOf(".css") > -1) {
					yield buildCss(key, patterns[key], scfg.env === "development");
				} else if (key.indexOf(".js") > -1) {
					yield buildJS(key, patterns[key], scfg.env === "development");
				}
			}
			const embercfg = require(`${process.cwd()}/config/ember`);
			for (const ember_app in embercfg) {
				let configuration = {
					directory: embercfg[ember_app].directory,
					mount: embercfg[ember_app].mount,
					build: "development",
					layout: embercfg[ember_app].layout
				};
				yield preBuildEmber(ember_app, configuration);
				yield buildEmber(ember_app, {
					mount: embercfg[ember_app].directory,
					build: options.prod,
					directory: embercfg[ember_app].directory
				});
				yield postBuildEmber(ember_app, configuration);
			}
			utils.log("Compressing Images");
			yield compressImages([path.join('assets', 'img', '*.{jpg,png}')], path.join('public', 'img'));
			utils.nlog("Images Compressed");
		}
	}
};
