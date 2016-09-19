"use strict";
const MM = require('../modelmanager'),
	screen = require('../../lib/welcome'),
	chokidar = require('chokidar'),
	path = require('path'),
	watching = [],
	Promise = require('bluebird'),
	fs = require("graceful-fs"),
	co = require('co');
let building = [],
	livereload = null,
	utils = null,
	buildcmd = null,
	notifier = null;
const deleted = function(file) {
		const remove = require("graceful-fs").unlinkSync;
		try {
			remove(file.replace("assets", "public"));
		} catch (e) {
			console.log(file.replace("assets", "public"));
		}
		livereload.reload(file);
	},
	compress = function(file) {
		buildcmd.compressImages([file], file.replace(path.basename(file), "").replace("assets", "public")).then(() => {
			livereload.reload(file);
		});
	},
	WactchAndCompressImages = function*(watcher) {
		const spinner = require('../spinner')();
		spinner.start(50, "Compressing Images".green, undefined, process.stdout.columns);
		watching.push(watcher);
		yield buildcmd.compressImages([path.join('assets', 'img', '*.{jpg,png}')], path.join('public', 'img'));
		watcher
			.on('change', compress)
			.on('unlink', deleted)
			.on('add', compress);
		spinner.end("Images Compressed " + `✓`.green);
	},
	checkAssetsToBuild = function*(watch) {
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
								let reload = differences.added[0];
								if (differences.isnew) {
									yield getMapping(branch, newconf[branch]);
								} else {
									BundleMappings[branch].watcher.unwatch(differences.removed);
									BundleMappings[branch].watcher.add(differences.added);

								}
								console.log("touching", reload);
								fs.closeSync(fs.openSync(reload, 'a'));
							}
						}
						BundleSource = newconf;
					} catch (e) {
						console.log(e.stack);
					}
				});
			},
			RebuildAndReload = function(compiledFile, targets, sources, build) {
				console.log("some loading");
				co(function*() {
					yield build(compiledFile, sources, !production);
				}).then(() => {
					targets.forEach(function(target) {
						livereload.reload(target);
					});
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
					let targets = [];
					for (let _ in buildresult) {
						targets.push(_);
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
						Target: targets,
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
						Target: [file],
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
				if (!production) {
					let element = BundleMappings[file];
					let rebuild = RebuildAndReload.bind(null, file, element.Target, element.Sources, element.Build);
					element.watcher
						.on('change', rebuild)
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
		spinner.end("Bundles Built " + `✓`.green);
		return true;
	},
	serveEmber = function(app, cfg, index) {
		return Promise.promisify((app, mount, subdomain, cb) => {
			let appst = {
				log: false,
				result: ""
			};
			const ember = utils.spawn("ember", ["serve", "-lr", "false", "--output-path", path.join("..", "..", "public", cfg.directory), "--port", 4200 + index], {
				cwd: ProyPath("ember", app)
			});
			ember.stdout.on('data', (buffer) => {
				if (appst.log) {
					console.log(buffer.toString());
				} else if (buffer.toString().indexOf("Build successful") > -1) {
					if (cb) {
						subdomain = subdomain ? subdomain + "." : "";
						appst.result = `${app.yellow} → http://${scfg.hostname}:${scfg.port}${mount.cyan}`;

						// let watcher = new chokidar.watch(ProyPath('public', app, '/'), {
						// 	ignored:[
						// 		"**/adapters/application.js",
						//
						// 	],
						// 	persistent: true,
						// 	ignoreInitial: true,
						// 	alwaysStat: false,
						// 	awaitWriteFinish: {
						// 		stabilityThreshold: 2000,
						// 		pollInterval: 100
						// 	}
						// });
						// setTimeout(function(){
						// 	console.log("w",watcher.getWatched());
						// },1000);
						// //watcher.unwatch('new-file*');
						// const rebuild = function() {
						// 	co(function*(){
						// 		yield TriggerEvent('post', 'ember_build');
						// 		yield koaton_modules_postbuild();
						// 	});
						// 	livereload.reload();
						// 	notifier.notify({
						// 		title: 'Koaton',
						// 		message: `EmberApp ${app} changed ...`,
						// 		icon: path.join(__dirname, 'koaton.png'),
						// 		sound: 'Basso'
						// 	});
						// }
						// watcher
						// 	.on('change', rebuild)
						// 	.on('unlink', rebuild)
						// 	.on('add', rebuild)
						// 	.on('unlinkDir', rebuild);
							cb(null, appst);
							cb = null;
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
	},
	seedkoaton_modules = function() {
		fs.access(ProyPath("koaton_modules"), fs.RF_OK | fs.W_OK, (err) => {
			if (!err) {
				readDir(ProyPath("koaton_modules")).forEach((Module) => {
					try {
						requireNoCache(ProyPath("koaton_modules", Module, "koaton_prebuild.js"))();
					} catch (e) {}
				});
			}
		});
	},
	koaton_modules_postbuild = function() {
		let promises=[];
		fs.access(ProyPath("koaton_modules"), fs.RF_OK | fs.W_OK, (err) => {
			if (!err) {
				readDir(ProyPath("koaton_modules")).forEach((Module) => {
					console.log("start post building")
					promises.push(co(function*(){
						yield Events(`koaton_modules/${Module}/events`, 'post', 'ember_build');
					}));
					console.log("end post building")
				});
			}
		});
		return Promise.all(promises);
	},
	WatchModels = function WatchModels(chokidar) {
		const addmodelfn = function addmodelfn(file) {
			let model = path.basename(file).replace(".js", "");
			let Model = MM(model, requireNoCache(file)).toMeta();
			Kmetadata.database.models[model] = Model.model;
			if (Model.relations.length > 0) {
				Kmetadata.database.relations[model] = Model.relations;
			}
		};
		let watchmodels = new chokidar.watch(ProyPath("models", "**"), {
			persistent: true,
			ignoreInitial: true,
			alwaysStat: false,
			awaitWriteFinish: {
				stabilityThreshold: 250,
				pollInterval: 100
			}
		});
		watchmodels.on('add', addmodelfn).on('change', addmodelfn).on('unlink', (file) => {
			let model = path.basename(file).replace(".js", "");
			delete Kmetadata.database.models[model];
			delete Kmetadata.database.relations[model];
			let deletions = [];
			const check = function check(rel) {
				if (Kmetadata.database.relations[idx][rel].indexOf(` ${model} `) > -1) {
					deletions.push({
						idx: idx,
						rel: rel
					});
				}
			}
			for (var idx in Kmetadata.database.relations) {
				Object.keys(Kmetadata.database.relations[idx]).forEach(check);
			}
			deletions.forEach((obj) => {
				delete Kmetadata.database.relations[obj.idx][obj.rel];
			});
		});
	},
	TriggerEvent = function* TriggerEvent(event, phase) {
		yield Events("events", event, phase);
	},
	buildHosts = function* buildHosts() {
		const os = require("os");
		let subdomains = require(ProyPath('config', 'server'));
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
	};
module.exports = {
	cmd: "serve",
	description: "Runs your awsome Koaton applicaction using nodemon",
	args: [],
	options: [
		["-s", "--skip-build"],
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
		const Promise = require('bluebird'),
			nodemon = require('nodemon'),
			embercfg = require(`${process.cwd()}/config/ember`),
			env = {
				welcome: true,
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
			yield buildHosts();
			livereload.listen({
				port: 62627,
				quiet: true
			});
		}
		screen.start();
		if (options.production === "development") {
			yield require('./build').copystatic();
			yield WactchAndCompressImages(new chokidar.watch(path.join('assets', 'img'), {
				persistent: true,
				ignoreInitial: true,
				alwaysStat: false,
				awaitWriteFinish: {
					stabilityThreshold: 1000,
					pollInterval: 100
				}
			}));
			yield checkAssetsToBuild(chokidar.watch);
			WatchModels(chokidar);
		}
		yield TriggerEvent('pre', 'serve');
		seedkoaton_modules();
		console.log(env);
		return new Promise(function(resolve) {
			nodemon({
				ext: '*',
				quiet: true,
				delay: 300,
				ignore: [
					"/views/ember_apps/*.*",
					"/node_modules/*.*",
					"/node_modules/*.*",
					"/koaton_modules/*.*",
					"/ember/*.*",
					"/assets/*.*",
					"/models/*.*",
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
					yield TriggerEvent('pre', 'serve');
					screen.line1(true);
					let ignoreemberdirs = [];
					let indexapp = 0;
					yield TriggerEvent('pre', 'ember_build');
					for (var ember_app in embercfg) {
						ignoreemberdirs.push(path.join("public", ember_app, "/"));
						if (options.production === "development" && !options.skipBuild) {
							const configuration = {
								directory: embercfg[ember_app].directory,
								mount: embercfg[ember_app].mount,
								build: "development",
								layout: embercfg[ember_app].layout,
								title:embercfg[ember_app].title
							};
							utils.nlog(`Building ${ember_app.green} second plane`);
							yield buildcmd.preBuildEmber(ember_app, configuration);
							let b = serveEmber(ember_app, embercfg[ember_app], indexapp)
							building.push(b);
							yield b;
							yield buildcmd.postBuildEmber(ember_app, configuration);
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
						co(function*() {
							yield TriggerEvent('post', 'ember_build');
							yield koaton_modules_postbuild();
						});
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
			}).on('restart', function(a, b, c) {
				console.log(a, b, c);
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
				resolve(1);
			});
			const exitHandler = function() {
				nodemon.emit('exit');
				resolve(0);
			};
			process.once('SIGINT', exitHandler);
		});
	}
};
