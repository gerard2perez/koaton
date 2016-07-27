"use strict";
const screen = require('../../lib/welcome');
const chokidar = require('chokidar');
const path = require('path');
const watching = [];
const Promise = require('bluebird');
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

const checkAssetsToBuild = function*(production, watch) {
	const co = require('co'),
		assets = require('./build'),
		bundles = JSON.parse(yield utils.read(path.join(process.cwd(), "./.koaton_bundle"))),
		bundlescfg = require(path.join(process.cwd(), "config", "bundles.js"));
	let files = {};
	for (const file in bundles) {
		if (file.indexOf(".css") > -1) {
			let ffs = yield assets.buildCSS(file, bundlescfg[file], !production, !production && !(utils.canAccess(path.join(process.cwd(), "public", file))));
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
				Paths: yield assets.buildJS(file, bundlescfg[file], !production, !production && !(utils.canAccess(path.join(process.cwd(), "public", file)))),
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
				.on('unlinkDir', rebuild);
		}
	}
	return true;
}

const serveEmber = function(app, mount) {
	return Promise.promisify((app, mount,cb)=>{
		let logging = false;
		const ember = utils.spawn("ember",["serve","-lr","false","--output-path",path.join("..","..","public",app)],{
			cwd:path.join(process.cwd(),"ember",app)
		});
		ember.stdout.on('data',(buffer)=>{
			if(logging){
				console.log(buffer.toString());
			}else if(buffer.toString().indexOf("Build successful")>-1){
				if(cb){
					logging = true;
					cb(null,`${app.yellow} → ${mount.cyan}`);
					cb = null;
					console.log(path.join(process.cwd(),'public',app,'**','/','**'));
					let watcher = new chokidar.watch(path.join(process.cwd(),'public',app,'/'), {
						persistent: true,
						ignoreInitial: true,
						alwaysStat: false,
						awaitWriteFinish: {
							stabilityThreshold: 2000,
							pollInterval: 100
						}
					});
					const rebuild = function(){
						livereload.reload();
					}
					watcher
						.on('change', rebuild)
						.on('unlink', rebuild)
						.on('add', rebuild)
						.on('unlinkDir', rebuild);
				}

			}
		});
		ember.stderr.on('data',(buffer)=>{
			if(cb){
				cb(null,`${app.yellow} ${"✗".red} build failed.`);
				cb = null;
			}
			console.log(buffer.toString());
		});
	})(app, mount);
}
/*const watchEmber = function(app, mount, updatefn, result) {
	if (result === 0) {
		const watcher = chokidar.watch(path.join(
			"ember", app, "/"
		), {
			ignored: [
				`ember/${app}/app/initializers/inflector.js`,
				`ember/${app}/node_modules`,
				`ember/${app}/bower_components`,
				`ember/${app}/dist`,
				`ember/${app}/.git`,
				`ember/${app}/vendor`,
				`ember/${app}/public`,
				`ember/${app}/tmp`,
				`ember/${app}/ember-cli-build.js`,
				`ember/${app}/bower.json`,
				`ember/${app}/package.json`,
				`ember/${app}/testem.js`,
				`ember/${app}/*.md`,
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
			.on('change', updatefn)
			.on('unlink', updatefn)
			.on('add', updatefn)
			.on('unlinkDir', updatefn);
		return `${app.yellow} → ${mount.cyan}`;
	} else {
		return "";
	}
}*/

module.exports = {
	cmd: "serve",
	description: "Runs your awsome Koaton applicaction using nodemon",
	args: [],
	options: [
		["-p", "--production", "Runs with NODE_ENV = production"],
		//["-b", "--build", "Builds the ember apss."],
		["--port", "--port <port>", "Run on the especified port (port 80 requires sudo)."]
	],
	action: function*(options) {
		const Promise = require('bluebird'),
			nodemon = require('nodemon'),
			notifier = require('node-notifier'),
			//shell = require('../utils').shell,
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
		/*const updateApp = function(app) {
			notifier.notify({
				title: 'Koaton',
				message: 'Rebuilding app: ' + app,
				icon: path.join(__dirname, 'koaton.png'),
				sound: 'Hero',
				wait: false
			});
			shell("Building " + ember_app.green, ["koaton", "ember", app, "-b", env.NODE_ENV], process.cwd()).then(() => {
				livereload.reload();
			});
		}*/
		screen.start();
		//const inflections = require(path.join(process.cwd(), "config", "inflections.js"));
		/*let irregular = (inflections.plural || [])
			.concat(inflections.singular || [])
			.concat(inflections.irregular || []);
		let uncontable = (inflections.uncountable || []).map((inflection) => {
			return `/${inflection}/`
		});*/
		/*let inflector = utils.Compile(yield utils.read(path.join(__dirname, "..", "templates", "ember_inflector"), {
			encoding: "utf-8"
		}), {
			irregular: JSON.stringify(irregular),
			uncontable: JSON.stringify(uncontable)
		});*/
		let ignoreemberdirs = [];
		const buildcmd = require('./build');
		for (var ember_app in embercfg) {
			ignoreemberdirs.push(path.join("public", ember_app, "/"));
			/*if (options.build) {
				yield utils.write(path.join("ember", ember_app, "app", "initializers", "inflector.js"), inflector, true);
				const stbuild = shell("Building " + ember_app.green, ["koaton", "ember", ember_app, "-b", env.NODE_ENV], process.cwd());
				building.push(
					stbuild.then(
						watchEmber.bind(null, ember_app, embercfg[ember_app].mount,
							updateApp.bind(null, ember_app))));
			} else {*/
				if (!options.production) {
					let serving = serveEmber(ember_app, embercfg[ember_app].mount);
					building.push(serving);
					yield buildcmd.preBuildEmber(ember_app,{directory:embercfg[ember_app].directory,mount:embercfg[ember_app].mount,build:"development"});
					yield serving;
					yield buildcmd.postBuildEmber(ember_app,{directory:embercfg[ember_app].directory,mount:embercfg[ember_app].mount,build:"development"});
				}else{
					building.push(Promise.resolve(`${ember_app.yellow} → ${embercfg[ember_app].mount.cyan}`));
				}
			//}
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
		yield checkAssetsToBuild(options.production, chokidar.watch);
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
