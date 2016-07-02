"use strict";
const screen = require('../../lib/welcome');
const path = require('path');
const watching = [];
let imagemin = null;
let imageminMozjpeg = null;
let imageminPngquant = null;
let building = [];
let livereload = null;
let utils = null;
const deleted = function(file) {
	const remove = require("graceful-fs").unlinkSync;
	try {
		remove(file.replace("assets", "public"));
	} catch (e) {
		console.log(file.replace("assets", "public"));
	}
	livereload.reload(file);
}
const compress = function(file) {
	imagemin([file], file.replace(path.basename(file), "").replace("assets", "public"), {
		plugins: [
			imageminMozjpeg({}),
			imageminPngquant({
				quality: '80-90'
			})
		]
	});
	livereload.reload(file);
}
const WactchAndCompressImages = function*(watcher) {
	watching.push(watcher);
	yield imagemin([path.join('assets', 'img', '*.{jpg,png}')], path.join('public', 'img'), {
		plugins: [
			imageminMozjpeg({}),
			imageminPngquant({
				quality: '80-90'
			})
		]
	});
	watcher
		.on('change', compress)
		.on('unlink', deleted)
		.on('add', compress);
}

const checkAssetsToBuild = function*(production, isbuild, watch) {
	const co = require('co'),
		assets = require('./build'),
		bundles = JSON.parse(yield utils.read(path.join(process.cwd(), "./.koaton_bundle"))),
		bundlescfg = require(path.join(process.cwd(), "config", "bundles.js"));
	let files = {};
	for (const file in bundles) {
		if (file.indexOf(".css") > -1) {
			console.log(!production,isbuild , utils.canAccess(path.join(process.cwd(), "public", file)));
			let ffs = yield assets.buildCSS(file, bundlescfg[file], !production, !production && !(isbuild || utils.canAccess(path.join(process.cwd(), "public", file))));
			for (let f in ffs) {
				files[f] = {
					Paths: ffs[f],
					Target: file,
					Sources: bundlescfg[file],
					Build: assets.buildCSS
				};
			}
		} else {
			files[path.basename(bundles[file])] = {
				Paths: yield assets.buildJS(file, bundlescfg[file], !production, !production && !(isbuild||utils.canAccess(path.join(process.cwd(), "public", file)))),
				Target: file,
				Sources: bundlescfg[file],
				Build: assets.buildJS
			};
		}
	}
	if (!production) {
		const RebuildAndReload = function(compiledFile, target, sources, build) {
			co(function*() {
				yield build(target, sources, !production);
			}).then(() => {
				livereload.reload(compiledFile);
			});
		}
		for (const watchfile in files) {
			const element = files[watchfile];
			let rebuild = RebuildAndReload.bind(null, watchfile, element.Target, element.Sources, element.Build);
			const watcher = new watch(element.Paths, {
				persistent: true,
				ignoreInitial: true,
				alwaysStat: false,
				awaitWriteFinish: {
					stabilityThreshold: 1000,
					pollInterval: 100
				}
			});
			watcher
				.on('change', rebuild)
				.on('unlink', rebuild)
				.on('add', rebuild)
				.on('unlinkDir', rebuild) //.on('ready',()=>{console.log(watcher.getWatched());})
				// .on('error', watch_error);
			;
		}
	}
	return true;
}


const buildEmberApps=function*(){

}

module.exports = {
	cmd: "serve",
	description: "Runs your awsome Koaton applicaction using nodemon",
	args: [],
	options: [
		["-p", "--production", "Runs with NODE_ENV = production"],
		["-b", "--build", "Builds the ember apss."],
		["--port", "--port <port>", "Run on the especified port (port 80 requires sudo)."]
	],
	action: function*(options) {
		const Promise = require('bluebird'),
			nodemon = require('nodemon'),
			notifier = require('node-notifier'),
			shell = require('../utils').shell,
			chokidar = require('chokidar'),
			embercfg = require(`${process.cwd()}/config/ember`),
			env = {
				welcome: false,
				NODE_ENV: !options.production ? 'development' : 'production',
				port: options.port || 62626
			};
		utils = require('../utils');
		livereload = require('gulp-livereload');
		imagemin = require('imagemin');
		imageminMozjpeg = require('imagemin-mozjpeg');
		imageminPngquant = require('imagemin-pngquant');

		if (!options.production) {
			livereload.listen({
				port: 62627,
				quiet: true
			});
		}
		let build = [];
		const watch_error = function(e) {
			console.log(`Watcher error: ${e}`);
		}
		const updateApp = function(app, file) {
			console.log(file);
			notifier.notify({
				title: 'Koaton',
				message: 'Rebuilding app: ' + app,
				icon: path.join(__dirname, 'koaton.png'),
				sound: 'Hero',
				wait: false
			});
			// shell("Building " + ember_app.green, ["koaton", "ember", app, "-b", env.NODE_ENV], process.cwd()).then(() => {
			// 	livereload.reload();
			// });
		}
		const onBuild = function(update, result) {
			if (result === 0) {
				const watcher = chokidar.watch(path.join(
					"ember", ember_app, "/"
				), {
					ignored: [
						`ember/${ember_app}/app/initializers/inflector.js`,
						`ember/${ember_app}/node_modules`,
						`ember/${ember_app}/bower_components`,
						`ember/${ember_app}/dist`,
						`ember/${ember_app}/.git`,
						`ember/${ember_app}/vendor`,
						`ember/${ember_app}/public`,
						`ember/${ember_app}/tmp`,
						`ember/${ember_app}/ember-cli-build.js`,
						`ember/${ember_app}/bower.json`,
						`ember/${ember_app}/package.json`,
						`ember/${ember_app}/testem.js`,
						`ember/${ember_app}/*.md`,
						/[\/\\]\./
					],
					persistent: true,
					ignoreInitial: true,
					alwaysStat: false,
					awaitWriteFinish: {
						stabilityThreshold: 1000,
						pollInterval: 100
					}
				});
				watcher
					.on('change', update)
					.on('unlink', update)
					.on('add', update)
					.on('unlinkDir', update) //.on('ready',()=>{console.log(watcher.getWatched());})
					.on('error', watch_error);
				watching.push(watcher);
				return `${ember_app.yellow} → ${embercfg[ember_app].mount.cyan}`;
			} else {
				return "";
			}
		}
		screen.start();
		const inflections = require(path.join(process.cwd(), "config", "inflections.js"));
		let irregular = (inflections.plural || [])
			.concat(inflections.singular || [])
			.concat(inflections.irregular || []);
		let uncontable = (inflections.uncountable || []).map((inflection) => {
			return `/${inflection}/`
		});

		let ignoreemberdirs = [];
		for (var ember_app in embercfg) {
			ignoreemberdirs.push(path.join("**", "public", ember_app, "**"));
			if (build.indexOf(ember_app) === -1) {
				let inflector = utils.Compile(yield utils.read(path.join(__dirname, "..", "templates", "ember_inflector"), {
					encoding: "utf-8"
				}), {
					irregular: JSON.stringify(irregular),
					uncontable: JSON.stringify(uncontable)

				});
				yield utils.write(path.join("ember", ember_app, "app", "initializers", "inflector.js"), inflector, true);
				const update = updateApp.bind(null, ember_app);
				if (options.build) {
					const stbuild = shell("Building " + ember_app.green, ["koaton", "ember", ember_app, "-b", env.NODE_ENV], process.cwd());
					building.push(stbuild.then(onBuild.bind(null, update)));
					yield stbuild;
				} else {
					if (!options.production) {
						onBuild(update, 0);
					}
					building.push(Promise.resolve(`${ember_app.yellow} → ${embercfg[ember_app].mount.cyan}`));
				}
			}
		}
		if (!options.production) {
			yield WactchAndCompressImages(new chokidar.watch(path.join('assets', 'img'), {
				persistent: true,
				ignoreInitial: true,
				alwaysStat: false,
				awaitWriteFinish: {
					stabilityThreshold: 2000,
					pollInterval: 100
				}
			}));
		}
		yield checkAssetsToBuild(options.production, options.build, chokidar.watch);
		return new Promise(function(resolve) {
			nodemon({
				ext: '*',
				quiet: true,
				delay: 500,
				ignore: [
					"/views/*.*",
					"/node_modules/*.*",
					"/bower_components/*.*",
					"/ember/*.*",
					"/assets/*.*",
					"/public/",
					"*.tmp",
					"*.json"
					// ,".*"
				],
				verbose: false,
				script: 'app.js',
				env: env,
				stdout: true
			}).once('start', function() {
				screen.lift(env, building);
				notifier.notify({
					title: 'Koaton',
					message: `Server running on localhost: ${env.port}`,
					open: `http://localhost: ${env.port}`,
					icon: path.join(__dirname, 'koaton.png'),
					sound: 'Hero',
					wait: false
				});
				setTimeout(function() {
					livereload.reload();
				}, 1000);
			}).on('restart', function() {
				setTimeout(function() {
					livereload.reload();
				}, 1000);
				notifier.notify({
					title: 'Koaton',
					message: 'restarting server...',
					icon: path.join(__dirname, 'koaton.png'),
					sound: 'Basso'
				});
			}).on('crash', () => {

			});
			const exitHandler = function() {
				nodemon.emit('exit');
				resolve(0);
			};
			process.once('SIGINT', exitHandler);
		});
	}
};
