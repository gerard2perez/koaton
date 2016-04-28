"use strict";
const Promise = require('bluebird');
const colors = require('colors');
const prompt = require('co-prompt');
const path = require('path');
const fs = require('fs');
const co = require('co');
const spawn = require('child_process').spawn;
const _exec = require('child_process').exec;
const utils = require('./utils').utils;
const print = require('./console');
const version = require(path.resolve() + "/package.json").version;
const secret = require('./secret');
const ADP = require('./adapters');
const adapters = ADP.adapters;

function exec(cmd, opts) {
	opts || (opts = {});
	return new Promise((resolve, reject) => {
		const child = _exec(cmd, opts, (err, stdout, stderr) => err ? reject(err) : resolve({
			stdout: stdout,
			stderr: stderr
		}));
		if (opts.stdout) {
			child.stdout.pipe(opts.stdout);
		}
		if (opts.stderr) {
			child.stderr.pipe(opts.stderr);
		}
	});
}

var application = "";
var buffer = "";

function endstream() {
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	buffer = "";
}

function output(data) {
	buffer += data.toString();
	if (buffer.indexOf('\n') > -1 && buffer.indexOf("idealTree") === -1 && buffer.indexOf("currentTree") === -1) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		buffer = buffer.split('\n')[0].split(" ").slice(2).join(" ");
		process.stdout.write(buffer);
		buffer = "";
	}
}

function npmlog(command, cwd, cb) {
	var child = spawn(command[0], command.slice(1), {
		cwd: cwd
	});
	child.stdout.on('data', output);
	child.stderr.on('data', output);
	child.on('close', function () {
		endstream();
		cb && cb(null, true);
	});
}

const NMPLog = Promise.promisify(npmlog);

/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */
function setupApplication(proyect_path, db, eg, options) {
	co(function* (val) {
		yield utils.mkdir(proyect_path);
		yield utils.compile('app.js');
		yield utils.mkdir(proyect_path + "/config");
		yield utils.compile('config/models.js');
		yield utils.compile('config/views.js');
		yield utils.compile('config/server.js', {
			key: `"${(yield secret(48)).toString('hex')}"`
		});
		yield utils.compile('config/connections.js');
		yield utils.compile('config/bundles.js');
		yield utils.compile('config/routes.js');
		yield utils.mkdir(proyect_path + "/assets/img");
		yield utils.mkdir(proyect_path + "/assets/js");
		yield utils.mkdir(proyect_path + "/assets/css");
		yield utils.copy('../bin/koaton.png', 'assets/img/logo.png');
		yield utils.copy("../bin/koaton-char.png", "assets/img/favicon.ico");
		yield utils.mkdir(proyect_path + "/node_modules");
		try {
			fs.symlinkSync(__dirname + "/../", proyect_path + "/node_modules/koaton");
		} catch (e) {

		}
		yield utils.mkdir(proyect_path + "/controllers");
		yield utils.mkdir(proyect_path + "/models");
		yield utils.mkdir(proyect_path + "/public");
		yield utils.mkdir(proyect_path + "/views/layouts");
		yield utils.copy("/views/layouts/main.handlebars");
		yield utils.compile('/views/index.html', {
			application: application
		});
		yield utils.compile('bower.json', {
			application: application
		});

		var pk = require('../templates/package');
		pk.name = application;
		if (!options.skipNpm) {
			yield utils.write(application + "/package.json", JSON.stringify(pk, null, '\t'), null);
			console.log(print.line1);
			console.log(print.center("Installing core dependencies"));
			yield NMPLog(["npm", "install", "--loglevel", "info"], application);
			console.log(print.center("Installing database adapter " + db[2].green));
			yield NMPLog(db, application);
			console.log(print.center("Installing view engine " + eg[2].green));
			yield NMPLog(eg, application);
		} else {
			pk.dependencies[eg[2]] = "latest";
			pk.dependencies[db[2]] = "latest";
			yield utils.write(application + "/package.json", JSON.stringify(pk, null, '\t'), null);
		}
		if (!options.skipBower) {
			console.log(print.line1);
			console.log(print.center("Installing Bower dependencies"));
			yield NMPLog(["bower", "install"], application);
		}
	}).then(function () {
		process.on('exit', function () {
			console.log(print.line1);
			console.log(print.line2.center);
			console.log("   To run your app first: ");
			console.log('     $' + ' cd %s '.bgWhite.black, application);
			console.log('   and then: ');
			console.log('     $' + ' koaton serve '.bgWhite.black);
			console.log(print.line3("or"));
			console.log('     $' + 'cd %s && koaton serve '.bgWhite.black.bold, application);
			console.log();
			console.log();
		});
	});

}

function engine(selection) {
	switch (selection) {

	case "atpl":
	case "doT":
	case "dust":
	case "dustjs-linkedin":
	case "eco":
	case "ect":
	case "ejs":
	case "haml":
	case "haml-coffee":
	case "hamlet":
	case "handlebars":
	case "hogan":
	case "htmling":
	case "jade":
	case "jazz":
	case "jqtpl":
	case "JUST":
	case "liquor":
	case "lodash":
	case "mote":
	case "mustache":
	case "nunjucks":
	case "QEJS":
	case "ractive":
	case "react":
	case "slm":
	case "swig":
	case "templayed":
	case "twig":
	case "liquid":
	case "toffee":
	case "underscore":
	case "vash":
	case "walrus":
	case "whiskers":
		selection = selection.toLocaleLowerCase();
		break;
	case undefined:
		selection = "handlebars";
		break;
	default:
		console.log("unknow template engine".red.bold);
		process.exit(1);
		break;
	}
	return ["npm", "install", selection, "--save", "--loglevel", "info"];
}

function proxydb(driver) {
	switch (driver) {
	case "mariadb":
		driver = "mysql";
		break;
	case "mongo":
		driver = "mongoose";
		break;
	case "postgres":
		driver = "pg";
		break;
	case "mongoose":
	case "mysql":
	case "redis":
	case "sqlite3":
	case "couchdb":
	case "neo4j":
	case "riak":
	case "firebird":
	case "tingodb":
	case "rethinkdb":
		break;
	case undefined:
		driver = "mongoose";
		break;
		default:
			driver=null;
			break;
	}
	return driver;
}

function database(selection) {
	selection = proxydb(selection);
	if(selection==null){
		console.log("Unknown driver.".red);
		process.exit(1);
	}
	return ["npm", "install", selection, "--save", "--loglevel", "info"];
}
module.exports = [
	function (commands) {
		delete this[0];
		console.log("  version: " + version);
		console.log("  Command list:");
		commands.forEach(function (definition) {
			var args = definition.args.length > 0 ? `<${definition.args.join(" > <")}>` : "";
			var opts = definition.options.length > 0 ? "[options]" : "";
			console.log(`    koaton ${definition.cmd} ${args.yellow} ${opts.cyan}`);
			console.log(`      ${definition.description.replace('\n',"\n   ")}`);
			definition.options.forEach(function (option) {
				var opt = option[1].split(' ');
				opt[0] = option[0] === opt[0] ? "" : opt[0];
				opt[1] = opt[1] || "";
				while (opt[0].length < 13) opt[0] = opt[0] + " ";
				console.log(`      ${option[0].cyan} ${opt[0].gray} ${opt[1].cyan} ${option[2]}`);
				//				command.option(`${option[0]}, ${option[1]}`, option[2]);
			});
			console.log();
		});
		process.exit(0);
	},
	{
		cmd: "barebone",
		description: "Runs your awsome Koaton applicaction",
		args: [],
		options: [
			["-p", "--production", "Runs with NODE_ENV = production"]
		],
		action: function (options) {

		}
	},
	{
		cmd: "adapter",
		description: "Install the especified driver adapter.",
		args: ["driver"],
		options: [
			["-l", "--list", "Show the adapters installed in the current application. " + "koaton adapter -l".bgWhite.black],
			["-g", "--generate", "Creates an adapter template for the especified driver"],
			["--host", "--host <hostname>", "Default is localhost. Use this with -g"],
			["--port", "--port <port>", "Default driver port. Use this with -g"],
			["--user", "--user <username>", "User to connect to database default is ''. Use this with -g"],
			["--db", "--db <databse>", "Database name for the connection default is ''. Use this with -g"],
			["--password", "--password <databse>", "Password to login in your database default is ''. Use this with -g"],
		],
		action: function (driver, options) {
			const dependencies = require(path.resolve() + "/package.json").dependencies;
			let drivers = {};
			adapters.map((adapter) => {
				drivers[adapter] = dependencies[proxydb(adapter)] ? dependencies[proxydb(adapter)] : false;
			});
			let installed = {};
			let available = {};
			Object.keys(drivers).forEach((driver) => {
				if (drivers[driver]) {
					installed[driver] = drivers[driver];
				} else {
					available[driver] = drivers[driver];
				}
			});
			if (installed['mysql']) {
				delete available['mariadb'];
			}
			if (installed['pg']) {
				installed['postgres'] = installed['pg'];
				delete installed['pg'];
				delete available['postgres'];
			}
			if (adapters.indexOf(driver) == -1) {
				console.log("The driver you especied is not available please check: ".yellow);
				console.log();
				options.list = true;
			}
			if (options.list) {
				console.log("Installed drives: ");
				Object.keys(installed).forEach((driver) => {
					console.log(`\t${driver}@${installed[driver].cyan}`);
				});
				console.log();
				console.log("Available drives: ");
				Object.keys(available).forEach((driver) => {
					console.log(`\t${driver}`);
				});
			} else {
				co(function* () {
					if (!options.generate) {
						if (available[driver] === undefined) {
							console.log("The driver you especified is not available.".red);
							console.log("Available drives: ");
							Object.keys(available).forEach((driver) => {
								console.log(`\t${driver}`);
							});
							process.exit(1);
						}
						yield NMPLog(database(driver), process.cwd());
						console.log(`${driver}@${require(path.resolve() + "/package.json").dependencies[proxydb(driver)]} installed`);
						options.generate = true;
					}
					if (options.generate) {
						const Handlebars = require('handlebars');
						var adapterCFG = JSON.parse(Handlebars.compile(ADP.template)({
							adapter: driver,
							driver: proxydb(driver),
							user: options.user || '',
							password: options.password || '',
							host: options.host || 'localhost',
							port: options.port || ADP.connections[proxydb(driver)],
							application: options.db || path.basename(process.cwd())
						}), "\t");
						if (drivers === "sqlite3") {
							delete adapterCFG.port;
							delete adapterCFG.host;
							delete adapterCFG.pool;
							delete adapterCFG.ssl;
						}
						try {
							var connections = require(process.cwd() + "/config/connections");
							if (connections[driver] === undefined) {
								connections[driver] = adapterCFG;
							} else {
								console.log(`An adapter named ${driver.green} already exits in ./config/${"connections.js".green}\nPlease update it manually.`);
								process.exit(1);
							}
							var output = '"use strict";\nmodule.exports=' + JSON.stringify(connections, null, '\t') + ";";
							utils.write(process.cwd() + "/config/connections.js", output).then(() => {
								console.log("Adapter added:");
								console.log(connections[driver]);
							}).catch((e) => {
								console.log(e.red);
								process.exit(1);
							});
						} catch (e) {
							console.log("Configuration file located at ./config/connections.js not found.");
						}

					} else {

					}
				});
			}
		}
	},
	{
		cmd: "new",
		description: `Creates a new koaton aplication.`,
		args: ["app_name"],
		options: [
			[
				"-d", "--db <driver>",
				"[ ".yellow +
				adapters.map(function (tx) {
					return tx.cyan;
				}).join(" | ".yellow)
				+ " ]".yellow
			],
			[
				"-e", "--view-engine <engine>",
				"[ ".yellow +
				["handlebars", "ejs"].map(function (tx) {
					return tx.cyan;
				}).join(" | ".yellow)
				+ " ]".yellow
			 //"[ atpl|doT|dust|dustjs-linkedin|eco|ect|ejs|haml|haml-coffee|hamlet|handlebars|hogan|htmling|jade|jazz\n\t\t\t\t jqtpl|JUST|liquor|lodash|mote|mustache|nunjucks|QEJS|ractive|react|slm|swig|templayed|twig|liquid|toffee\n\t\t\t\t underscore|vash|walrus|whiskers ]"
			],
			["-f", "--force", "Overrides the existing directory."],
			["-n", "--skip-npm", "Omits npm install"],
			["-b", "--skip-bower", "Omits bower install"],
		],
		action: function (app_name, options) {
			application = app_name;
			const proypath = path.resolve(app_name);
			utils.proyect_path = proypath;
			if (!application) {
				console.log(`${colors.yellow('The command requires a name to run.\n\tkoaton -h\nto see help.')}`);
				process.die(1);
			}
			const db = database(options.db);
			const eg = engine(options.viewEngine);
			var empty = utils.isEmpty(proypath);
			co(function* () {
				var ok = true;
				if (!(empty || options.force)) {
					ok = yield prompt.confirm(`destination ${colors.yellow(utils.proyect_path)} is not empty, continue? [y/n]: `);
				}
				if (ok) {
					process.stdin.destroy();
					utils.to_env = path.join(utils.to_env, application);
					setupApplication(proypath, db, eg, options);
				} else {
					utils.abort('aborting');
				}
			});
		}
	},
	{
		cmd: "serve",
		description: "Runs your awsome Koaton applicaction",
		args: [],
		options: [
			["-p", "--production", "Runs with NODE_ENV = production"],
			["-f", "--forever", "Runs your server with forever. Also sets NODE_ENV = production."],
			["--port", "--port <port>", "Run on the especified port (port 80 requires sudo)."]
		],
		action: function (options) {
			const env = {
				welcome: false,
				NODE_ENV: !options.production ? 'development' : 'production',
				port: options.port || 62626
			};
			if (options.forever) {
				env.NODE_ENV = 'production';
			}
			utils.welcome(env);
			const nodemon = require('gulp-nodemon');
			const livereload = require('gulp-livereload');
			const notifier = require('node-notifier');
			if (options.production) {
				livereload.listen({
					port: 62627,
					quiet: true
				});
			}
			if (options.forever) {
				const app = path.basename(process.cwd());
				const cmd = `NODE_ENV=${env.NODE_ENV} port=${env.port} forever start --colors --uid "koaton_${app}" -a app.js`;
				exec(`forever stop koaton_${app}`).catch(() => {}).finally(() => {
					exec(cmd, {
						cwd: process.cwd()
					}).then((data) => {
						console.log(app + " is running ... ");
					}).finally((a, b, c) => {
						process.exit(0);
					});
				});
			} else {
				nodemon({
					ext: '*',
					quiet: true,
					ignore: ["node_modules/*"],
					verbose: false,
					script: 'app.js',
					env: env,
					stdout: true
				}).once('start', function () {
					utils.info(env);
					notifier.notify({
						title: 'Koaton',
						message: 'Server runnung on localhost:' + env.port,
						open: "http://localhost:" + env.port,
						icon: path.join(__dirname, 'koaton.png'),
						sound: 'Hero',
						wait: false
					});
				}).on('restart', function () {
					setTimeout(function () {
						livereload.reload();
					}, 1000);
					notifier.notify({
						title: 'Koaton',
						message: 'restarting server...',
						icon: path.join(__dirname, 'koaton.png'),
						sound: 'Hero',
					});
				});
			}
		}
	},
	{
		cmd: "stop",
		description: "Stops the forever running server.",
		args: [],
		options: [],
		action: function (options) {
			exec(`forever stop koaton_${path.basename(process.cwd())}`).then((data) => {}).finally((a) => {
				process.exit(0);
			});
		}
	},
	{
		cmd: "list",
		description: "Lists all Koaton running applicactions.",
		args: [],
		options: [],
		action: function (options) {
			exec(`forever list`).then((data, data2) => {
				data = data.stdout.replace("info:    Forever processes running", "").replace(/ /igm, "-").replace(/data:/igm, "").replace(/-([a-z]|\/|[0-9])/igm, " $1").split('\n');
				var headers = data[1].trim().split(' ').slice(1);
				data = data.slice(2).map((d) => {
					return d.trim().split(' ')
				}).map((d) => {
					return d.slice(1);
				});
				headers[0] = headers[0].green;
				headers[1] = headers[1].gray.dim;
				headers[2] = headers[2].gray.dim;
				headers[3] = headers[3].gray.dim;
				headers[4] = headers[4].cyan;
				headers[5] = headers[5].gray.dim;
				headers[6] = headers[6].magenta;
				headers[7] = headers[7].yellow;
				data.pop();
				data.forEach((line) => {
					line[0] = line[0].green;
					line[1] = line[1].gray.dim;
					line[2] = line[2].gray.dim;
					line[3] = line[3].gray.dim;
					line[4] = line[4].cyan;
					line[5] = line[5].magenta;
					line[6] = line[6].yellow;
				});
				console.log(headers.join(' ').replace(/-/igm, " "));
				console.log(data.map((d) => {
					if (d[0].indexOf("koaton") > -1) {
						return d.join(' ').replace(/-/igm, " ");
					} else {
						return null;
					}

				}).join('\n'));
			}).finally((a) => {
				process.exit(0);
			});
		}
	},
	{
		cmd: "build",
		description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
		args: ["config_file"],
		options: [
				["-p", "--prod", "builds for production"]
			],
		action: function (config_file, options) {
			config_file = config_file || process.cwd() + '/config/bundles.js';
			var gulp = require('gulp');
			var browserify = require('browserify');
			var source = require('vinyl-source-stream');
			var buffer = require('vinyl-buffer');
			var glob = require('glob');
			var concat = require('gulp-concat');
			var _ = require('lodash');
			var sourcemaps = require('gulp-sourcemaps');
			var uglify = require('gulp-uglify');
			var hash = require('gulp-hash-filename');
			var patterns = require(config_file);
			if (Object.keys(patterns).length === 0) {
				console.log("Nothing to compile on: " + config_file);
			}
			Object.keys(patterns).forEach(function (key) {
				var info = patterns[key].map(function (file) {
					return path.basename(file).yellow;
				}).join(",".yellow.dim);
				info = "Compiling: ".green + info + " => " + "public/js/" + key.green.bold;
				console.log(info);
				if (!options.prod) {
					gulp.src(patterns[key])
						.pipe(sourcemaps.init())
						.pipe(uglify())
						.pipe(concat(key))
						.pipe(sourcemaps.write())
						.pipe(hash())
						.pipe(gulp.dest('./public/js'));

				} else {
					console.log(options.prod);
				}
			});
		}
			},
			];