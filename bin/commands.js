"use strict";
const colors = require('colors');
const prompt = require('co-prompt');
const path = require('path');
const utils = require('./utils');
const fs = require('fs');
const co = require('co');
const spawn = require('child_process').spawn;
var application = "";


/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */
function setupApplication(proyect_path) {
	co(function* (val) {
		yield utils.mkdir(proyect_path);
		utils.Compile('package.json');
		utils.Compile('app.js');
		yield utils.mkdir(proyect_path + "/config");
		utils.Compile('config/models.js');
		utils.Compile('config/views.js');
		utils.Compile('config/server.js');
		utils.Compile('config/connections.js');
		utils.Compile('config/bundles.js');
		yield utils.mkdir(proyect_path + "/node_modules");
		try {
			fs.symlinkSync(__dirname + "/../", proyect_path + "/node_modules/koaton");
		} catch (e) {

		}
		yield utils.mkdir(proyect_path + "/controllers");
		yield utils.mkdir(proyect_path + "/models");
		yield utils.mkdir(proyect_path + "/public");
		yield utils.mkdir(proyect_path + "/views/layouts");


	}).then(function () {
		console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
		console.log(utils.center("Installing dependencies ..."));
		
		var child2 = spawn("npm", ["install","--loglevel","silent"],{cwd:application});
		child2.stdout.pipe(process.stdout);
//		child2.stderr.pipe(process.stderr);
//		child2.stdio.pipe(process.stdio);
		process.on('exit', function () {
			console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
			console.log("   " + "-------------------------===-------------------------".dim + "   ");
			console.log("   To run your app first: " );
			console.log('     $'+' cd %s '.bgWhite.black, application);
			console.log("   " + "-------------------------===-------------------------".dim + "   ");
			console.log('   and then: ');
			console.log('     $'+' koaton serve '.bgWhite.black);
			console.log();
		});
	});

}

module.exports = [
	{
		cmd: "serve",
		description: "Runs your awsome Koaton applicaction",
		args: [],
		options: [],
		action: function () {
			var env = {
				welcome: false,
				'NODE_ENV': 'development',
				port: 62626
			};
			utils.welcome(env);
			const nodemon = require('gulp-nodemon');
			const livereload = require('gulp-livereload');
			const notifier = require('node-notifier');

			livereload.listen({
				port: 62627,
				quiet: true
			});
			var stream = nodemon({
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
					message: 'Server runnung on localhost:62626',
					open: "http://localhost:62626/",
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
			//				.on('restart', function () {
			//					gulp.src('app.js')
			//						.pipe(livereload());
			//				});
		}
	},
	{
		cmd: "build",
		description: "Make bundles of your .js .scss .css files and output to public folder.\nDefault value is ./config/bundles.js",
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
			if( Object.keys(patterns).length===0 ){
				console.log("Nothing to compile on: "+config_file);
			}
			Object.keys(patterns).forEach(function (key) {
				var info = patterns[key].map(function (file) {
					return path.basename(file).yellow;
				}).join(",".yellow.dim);
				info = "Compiling: ".green + info + " => " + key.green.bold;
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
	{
		cmd: "new",
		description: `Creates a new koa aplication and runs ${colors.green('npm init')} in it.`,
		args: ["app_name"],
		options: [
			["-f", "--force", "Overrides the existing directory."],
			["-sn", "--skip_npm", "Omits npm install"],
			["-sb", "--skip_bower", "Omits bower install"],
		],
		action: function (app_name, options) {
			application = app_name;
			utils.proyect_path = path.resolve(app_name);
			if (!app_name) {
				console.log(`${colors.yellow('The command requires a name to run.\n\tkoaton -h\nto see help.')}`);
			} else {
				var empty = utils.isEmpty(utils.proyect_path);
				if (empty || options.force) {
					setupApplication(utils.proyect_path);
				} else {
					var ok = false;
					co(function* () {
						ok = yield prompt.confirm(`destination ${colors.yellow(utils.proyect_path)} is not empty, continue? [y/n]: `);
					});
					if (ok) {
						process.stdin.destroy();
						setupApplication(utils.proyect_path);
					} else {
						utils.abort('aborting');
					}
				}
			}
		}
	}
];