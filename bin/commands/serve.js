"use strict";
const screen = require('../../lib/welcome');
const chokidar = require('chokidar');
const path = require('path');
const watching = [];
const Promise = require('bluebird');
const fs = require("graceful-fs");
let building = [];
let livereload = null;
let utils = null;
let buildcmd = null;
let notifier = null;
let serverconf = null;
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
	buildcmd.compressImages([file], file.replace(path.basename(file), "").replace("assets", "public")).then(() => {
		livereload.reload(file);
	});
}
const WactchAndCompressImages = function*(watcher) {
	const spinner = require('../spinner')();
	spinner.start(50, "Compressing Images".green, undefined, process.stdout.columns);
	watching.push(watcher);
	yield buildcmd.compressImages([path.join('assets', 'img', '*.{jpg,png}')], path.join('public', 'img'));
	watcher
		.on('change', compress)
		.on('unlink', deleted)
		.on('add', compress);
	spinner.end("Images Compressed " + `✓`.green);
}

const checkAssetsToBuild = function*(watch) {
	//===Constants
	const spinner = require('../spinner')(),
		glob = require('glob'),
		co = require('co'),
		assets = require('./build');
	spinner.start(50, "Building Bundles".green, undefined, process.stdout.columns);
	yield utils.mkdir(ProyPath("public", "css"), -1);
	yield utils.mkdir(ProyPath("public", "js"), -1);
	//==>
	let BundleMappings = {},
		BundleDir = path.normalize(ProyPath("config", "bundles.js")),
		BundleSource = require(BundleDir),
		production = scfg.env === "production";
	/*
	 *	Usefull functions
	 */
	const DetectChanges = function() {
			co(function*() {
				try {
					delete require.cache[BundleDir];
					const newconf = require(BundleDir);
					for (const branch in newconf) {
						if (hasChanged(BundleSource[branch], newconf[branch])) {
							let differences = getDiferences(BundleSource[branch], newconf[branch]);
							if (differences.isnew) {
								yield getMapping(branch, newconf[branch]);
							} else {
								BundleMappings[branch].watcher.unwatch(differences.removed);
								BundleMappings[branch].watcher.add(differences.added);
							}
						}
					}
					BundleSource = newconf;
				} catch (e) {
					console.log(e.stack);
				}
			});
		},
		RebuildAndReload = function(compiledFile, target, sources, build) {
			co(function*() {
				yield build(target, sources, !production);
			}).then(() => {
				livereload.reload(compiledFile);
				notifier.notify({
					title: 'Koaton',
					message: `Reloading ${compiledFile} on ${target}`,
					icon: path.join(__dirname, 'koaton.png'),
					sound: 'Hero',
					wait: false
				});
			});
		},
		getDiferences = function(oldbranch, newbranch) {
			let isnew = oldbranch === undefined;
			oldbranch = oldbranch || [];
			newbranch = newbranch || [];
			let added = [],
				removed = [];
			for (const file in newbranch) {
				if (oldbranch.indexOf(newbranch[file]) === -1) {
					added = added.concat(glob.sync(newbranch[file]));
				}
			}
			for (const file in oldbranch) {
				if (newbranch.indexOf(oldbranch[file]) === -1) {
					removed = removed.concat(glob.sync(oldbranch[file]));
				}
			}
			return {
				isnew: isnew,
				added: added.filter((file) => {
					return removed.indexOf(file) === -1;
				}),
				removed: removed.filter((file) => {
					return added.indexOf(file) === -1;
				})
			};
		},
		hasChanged = function(oldbranch, newbranch) {
			if (oldbranch === undefined) {
				return true;
			}
			for (const file in newbranch) {
				if (oldbranch.indexOf(newbranch[file]) === -1) {
					return true;
				}
			}
			for (const file in oldbranch) {
				if (newbranch.indexOf(oldbranch[file]) === -1) {
					return true;
				}
			}
			return false;
		},
		logger = function(msg) {
			spinner.update(msg.replace(/\n|\t/igm, ""));
		},
		getMapping = function*(file, config) {
			if (file.indexOf(".css") > -1) {
				let buildresult = yield assets.buildCSS(file, config, !production, production && !(utils.canAccess(ProyPath("public", "css", file))), logger);
				let paths = [];
				for (let _ in buildresult) {
					paths = paths.concat(buildresult[_]);
					/*BundleMappings[f] = {
						Target: file,
						Sources: config,
						Build: assets.buildCSS,
						watcher: new watch(ffs[f], {
							persistent: true,
							ignoreInitial: true,
							alwaysStat: false,
							awaitWriteFinish: {
								stabilityThreshold: 1000,
								pollInterval: 100
							}
						})
					};*/
				}
				BundleMappings[file] = {
					Target: file,
					Sources: config,
					Build: assets.buildCSS,
					watcher: new watch(paths, {
						persistent: true,
						ignoreInitial: true,
						alwaysStat: false,
						awaitWriteFinish: {
							stabilityThreshold: 300,
							pollInterval: 100
						}
					})
				};
			} else {
				BundleMappings[path.basename(file)] = {
					Target: file,
					Sources: config,
					Build: assets.buildJS,
					watcher: new watch(yield assets.buildJS(file, config, !production, production && !utils.canAccess(ProyPath("public", "js", file)), logger), {
						persistent: true,
						ignoreInitial: true,
						alwaysStat: false,
						awaitWriteFinish: {
							stabilityThreshold: 300,
							pollInterval: 100
						}
					})
				};
			}
		}

	/*
	 * Watch the bundle configuration file to rebuild changed or added bundles;
	 */
	const bwatcher = new watch(ProyPath("config", "bundles.js"), {
		persistent: true,
		ignoreInitial: true,
		alwaysStat: false,
		awaitWriteFinish: {
			stabilityThreshold: 300,
			pollInterval: 100
		}
	});
	bwatcher.on('change', DetectChanges);
	for (const file in BundleSource) {
		yield getMapping(file, BundleSource[file]);
	}
	//console.log(BundleMappings);
	if (!production) {
		for (const watchfile in BundleMappings) {
			const element = BundleMappings[watchfile];
			let rebuild = RebuildAndReload.bind(null, watchfile, element.Target, element.Sources, element.Build);
			element.watcher
				.on('change', rebuild)
				//.on('unlink', rebuild)
				//.on('add', rebuild)
				//.on('unlinkDir', rebuild);
			;
		}
	}
	/*let production = scfg.env === "production";


		bundlescfg = require(ProyPath("config", "bundles.js"));
	for (const file in bundlescfg) {
		if (file.indexOf(".css") > -1) {
			let ffs = yield assets.buildCSS(file, bundlescfg[file], !production, production && !(utils.canAccess(path.join(process.cwd(), "public", "css", file))), logger);
			for (let f in ffs) {
				BundleMappings[f] = {
					Paths: ffs[f],
					Target: file,
					Sources: bundlescfg[file],
					Build: assets.buildCSS,
					watcher: null
				};
			}
		} else {
			BundleMappings[path.basename(file)] = {
				Paths: yield assets.buildJS(file, bundlescfg[file], !production, production && !utils.canAccess(path.join(process.cwd(), "public", "js", file)), logger),
				Target: file,
				Sources: bundlescfg[file],
				Build: assets.buildJS,
				watcher: null
			};
		}
	}
	if (!production) {
		for (const watchfile in BundleMappings) {
			const element = BundleMappings[watchfile];
			let rebuild = RebuildAndReload.bind(null, watchfile, element.Target, element.Sources, element.Build);
			element.watcher = new watch(element.Paths, {
				persistent: true,
				ignoreInitial: true,
				alwaysStat: false,
				awaitWriteFinish: {
					stabilityThreshold: 1000,
					pollInterval: 100
				}
			});
			element.watcher
				.on('change', rebuild)
				.on('unlink', rebuild)
				.on('add', rebuild)
				.on('unlinkDir', rebuild);
		}
	}
	*/
	spinner.end("Bundles Built " + `✓`.green);
	return true;
}

const serveEmber = function(app, cfg, index) {
	return Promise.promisify((app, mount, subdomain, cb) => {
		let appst = {
			log: false,
			result: ""
		};
		const ember = utils.spawn("ember", ["serve", "-lr", "false", "--output-path", path.join("..", "..", "public", cfg.directory), "--port", 4200 + index], {
			cwd: path.join(process.cwd(), "ember", app)
		});
		ember.stdout.on('data', (buffer) => {
			if (appst.log) {
				console.log(buffer.toString());
			} else if (buffer.toString().indexOf("Build successful") > -1) {
				if (cb) {
					subdomain = subdomain ? subdomain + "." : "";
					let host = subdomain + serverconf.hostname + (serverconf.port !== 80 ? ":" + serverconf.port : "");
					appst.result = `${app.yellow} → http://${host}${mount.cyan}`;
					cb(null, appst);
					cb = null;
					let watcher = new chokidar.watch(path.join(process.cwd(), 'public', app, '/'), {
						persistent: true,
						ignoreInitial: true,
						alwaysStat: false,
						awaitWriteFinish: {
							stabilityThreshold: 2000,
							pollInterval: 100
						}
					});
					const rebuild = function() {
						livereload.reload();
						notifier.notify({
							title: 'Koaton',
							message: `EmberApp ${app} changed ...`,
							icon: path.join(__dirname, 'koaton.png'),
							sound: 'Basso'
						});
					}
					watcher
						.on('change', rebuild)
						.on('unlink', rebuild)
						.on('add', rebuild)
						.on('unlinkDir', rebuild);
				}

			}
		});
		ember.stderr.on('data', (buffer) => {
			if (cb) {
				cb(null, `${app.yellow} ${"✗".red} build failed.`);
				cb = null;
			}
			console.log(buffer.toString());
		});
	})(app, cfg.mount, cfg.subdomain || "");
}
module.exports = {
	cmd: "serve",
	description: "Runs your awsome Koaton applicaction using nodemon",
	args: [],
	options: [
		["-p", "--production", "Runs with NODE_ENV = production"],
		["--port", "--port <port>", "Run on the especified port (port 80 requires sudo)."]
	],
	action: function*(options) {
		process.env.port = options.port || 62626;
		options.production = options.production ? "production" : "development";
		process.env.NODE_ENV = options.production;
		buildcmd = require('./build');
		notifier = require('node-notifier');
		utils = require('../utils');
		livereload = require('gulp-livereload');
		serverconf = require(path.join(process.cwd(), "config", "server"));
		const mainhost = `htpp://${serverconf.hostname}` + (serverconf.port !== 80 ? ":" + serverconf.port : "");
		const os = require("os");
		const Promise = require('bluebird'),
			nodemon = require('nodemon'),
			embercfg = require(`${process.cwd()}/config/ember`),
			env = {
				welcome: false,
				NODE_ENV: process.env.NODE_ENV,
				port: process.env.port
			};
		let server_template = yield utils.read(path.join(__dirname, '..', "templates", 'nginx_conf_server'), 'utf-8');
		let nginx_conf = yield utils.read(path.join(__dirname, '..', "templates", 'nginx_conf_redirect'), 'utf-8');
		const hostname = require(`${process.cwd()}/config/server`).hostname;
		nginx_conf = utils.Compile(nginx_conf, {
			hostname: hostname
		});
		const subdomains = require(`${process.cwd()}/config/server`).subdomains;
		for (const idx in subdomains) {
			nginx_conf += utils.Compile(server_template, {
				subdomain: subdomains[idx],
				hostname: hostname,
				port: process.env.port
			});
		}
		yield utils.write(path.join(process.cwd(), `${require(path.join(process.cwd(),"package.json")).name}.conf`), nginx_conf);
		if (options.production === "development") {
			let subdomains = require(path.join(process.cwd(), 'config', 'server'));
			let hostname = subdomains.hostname;
			subdomains = subdomains.subdomains;

			if (subdomains.indexOf("www") === -1) {
				subdomains.push("www");
			}
			let hostsdlocation = "";
			switch (os.platform()) {
				case 'darwin':
					hostsdlocation = '/private/etc/hosts';
					break;
				case 'linux':
					hostsdlocation = '/etc/hosts';
					break;
				case 'win32':
					hostsdlocation = "C:\\Windows\\System32\\drivers\\etc\\hosts"
					break;
				default:
					console.log("your os is not detected, hosts files won't be updated".red);
					break;

			}
			if (hostsdlocation !== "") {
				let hostsd = fs.readFileSync(hostsdlocation, "utf-8");
				for (const subdomain in subdomains) {
					let entry = "127.0.0.1\t" + subdomains[subdomain] + "." + hostname;
					if (hostsd.indexOf(entry) === -1) {
						hostsd += "\n" + entry;
					}
				}
				yield utils.write(hostsdlocation, hostsd.replace(/\n+/igm, "\n"), true);
			}
			livereload.listen({
				port: 62627,
				quiet: true
			});
		}
		screen.start();
		if (options.production === "development") {
			yield WactchAndCompressImages(new chokidar.watch(path.join('assets', 'img'), {
				persistent: true,
				ignoreInitial: true,
				alwaysStat: false,
				awaitWriteFinish: {
					stabilityThreshold: 2000,
					pollInterval: 100
				}
			}));
			yield checkAssetsToBuild(chokidar.watch);
		}
		const co = require('co');
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
					"/config/bundles.js",
					"*.tmp",
					"*.json"
					// ,".*"
				],
				verbose: false,
				script: 'app.js',
				env: env,
				stdout: true
			}).once('start', function() {
				co(function*() {
					screen.line1(true);
					let ignoreemberdirs = [];
					let indexapp = 0;
					for (var ember_app in embercfg) {
						ignoreemberdirs.push(path.join("public", ember_app, "/"));
						if (options.production === "development") {
							const configuration = {
								directory: embercfg[ember_app].directory,
								mount: embercfg[ember_app].mount,
								build: "development"
							};
							console.log(1);
							utils.nlog(`Building ${ember_app.green} second plane`);
							yield buildcmd.preBuildEmber(ember_app, configuration);
							console.log(2);
							let b = serveEmber(ember_app, embercfg[ember_app], indexapp)
							building.push(b);
							yield b;
							console.log(3);
							yield buildcmd.postBuildEmber(ember_app, configuration);
							console.log(4);
						} else {
							building.push(Promise.resolve({
								log: false,
								result: `${ember_app.yellow} → ${embercfg[ember_app].mount.cyan}`
							}));
						}
						indexapp++;
					}
					screen.line1(true);
				}).then(() => {
					Promise.all(building).then((reports) => {
						if (reports.length > 0) {
							console.log("   Ember apps:");
							console.log("     " + reports.map((r) => {
								return r.result
							}).join('\n     '));
						}
						for (let idx in reports) {
							reports[idx].log = true;
						}
						screen.line1();
						console.log();
					});
					notifier.notify({
						title: 'Koaton',
						message: `Server running on http://${scfg.hostname}:${scfg.port}`,
						open: `http://${scfg.hostname}:${scfg.port}`,
						icon: path.join(__dirname, 'koaton.png'),
						sound: 'Hero',
						wait: false
					});
					setTimeout(function() {
						livereload.reload();
					}, 1000);
				});
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
