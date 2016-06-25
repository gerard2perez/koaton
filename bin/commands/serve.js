"use strict";
const screen = require('../../lib/welcome');
const path = require('path');
let building = [];
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
		const Promise = require('bluebird');
		const nodemon = require('nodemon');
		const livereload = require('gulp-livereload');
		const notifier = require('node-notifier');
		const shell = require('../utils').shell;
		const chokidar = require('chokidar');

		const embercfg = require(`${process.cwd()}/config/ember`);
		const env = {
			welcome: false,
			NODE_ENV: !options.production ? 'development' : 'production',
			port: options.port || 62626
		};
		const cfg = {
			ext: '*',
			quiet: true,
			delay: 500,
			ignore: [
				"**/node_modules/**",
				"**/bower_components/**",
				 "**/ember/**",
				 "**/assets/**",
				 "**/public/**",
				 "*.tmp"
			],
			verbose: false,
			script: 'app.js',
			env: env,
			stdout: true
		};
		if (!options.production) {
			livereload.listen({
				port: 62627,
				quiet: true
			});
		}
		let build = [];
		let watching = [];
		const watch_error = function(e) {
			console.log(`Watcher error: ${e}`);
		}
		const updateApp = function(app) {
			notifier.notify({
				title: 'Koaton',
				message: 'Rebuilding app: ' + app,
				icon: path.join(__dirname, 'koaton.png'),
				sound: 'Hero',
				wait: false
			});
			shell("Building " + ember_app.green, ["koaton", "ember", app, "-b", env.NODE_ENV], process.cwd());
			livereload.reload();
		}
		const onBuild = function(update, result) {
			if (result === 0) {
				const watcher = chokidar.watch(`ember/${ember_app}/**/*.js`, {
					ignored: [
						"**/node_modules/**",
						"**/bower_components/**",
						"**/tmp/**",
						"**/vendor/**",
						"**/**.tmp",
						/[\/\\]\./
					],
					persistent: true,
					alwaysStat: false,
					awaitWriteFinish: {
						stabilityThreshold: 1000,
						pollInterval: 100
					}
				});
				watcher
					.on('change', update)
					.on('unlink', update)
					.on('ready', () => watcher.on('add', updateApp))
					.on('unlinkDir', updateApp)
					.on('error', watch_error);
				watching.push(watcher);
				return `${ember_app.yellow} → ${embercfg[ember_app].mount.cyan}`;
			} else {
				return "";
			}
		}
		screen.start();
		for (var ember_app in embercfg) {
			if (build.indexOf(ember_app) === -1) {
				if (options.build) {
					const update = updateApp.bind(null, ember_app);
					const stbuild = shell("Building " + ember_app.green, ["koaton", "ember", ember_app, "-b", env.NODE_ENV], process.cwd());
					building.push(stbuild.then(onBuild.bind(null, update)));
					yield stbuild;
				} else {
					building.push(Promise.resolve(`${ember_app.yellow} → ${embercfg[ember_app].mount.cyan}`));
				}
			}
		}
		yield shell("Building Bundles", ["koaton", "build"], process.cwd());
		const patterns = require(path.join(process.cwd(), "config", "bundles.js"));
		const build_bundles = require('./build').rebuild;
		for (let key in patterns) {
			const rebuild = build_bundles.bind(null, key, patterns[key]);
			const bundles = new chokidar.watch(patterns[key], {
				persistent: true,
				alwaysStat: false,
				awaitWriteFinish: {
					stabilityThreshold: 1000,
					pollInterval: 100
				}
			});
			bundles
				.on('change', rebuild)
				.on('unlink', rebuild)
				.on('ready', () => bundles.on('add', rebuild))
				.on('unlinkDir', rebuild);
		}


		const watcher = chokidar.watch(path.join('assets','img'), {
			ignored: [
				"**/node_modules/**",
				"**/bower_components/**",
				"**/tmp/**",
				"**/vendor/**",
				"**/**.tmp",
				/[\/\\]\./
			],
			persistent: true,
			alwaysStat: false,
			awaitWriteFinish: {
				stabilityThreshold: 1000,
				pollInterval: 100
			}
		});
		watcher
			.on('change', update)
			.on('unlink', update)
			.on('ready', () => watcher.on('add', updateApp))
			.on('unlinkDir', updateApp)
			.on('error', watch_error);

		return new Promise(function(resolve) {
			nodemon(cfg).once('start', function() {
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
					sound: 'Hero'
				});
			}).on('crash', () => {

			});
			const exitHandler = function(options) {
				if (options.exit) {
					nodemon.emit('exit');
				}
				if (options.quit) {
					resolve(0);
				}
			};
			process.once('exit', exitHandler.bind(null, {
				exit: true
			}));
			process.once('SIGINT', exitHandler.bind(null, {
				quit: true
			}));
		});
	}
};
