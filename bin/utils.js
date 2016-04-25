//"use strict";
const fs = require('fs');
const mkdirp = require('mkdirp');
const Handlebars = require('handlebars');
const path = require('path');
const Promise = require('bluebird');
var total = "===-----------------------------------------------------===".length;
module.exports = {
	info(env) {
			var jutsus = require('./jutsus');
			jutsus = jutsus.S.concat(jutsus.A, jutsus.B, jutsus.C);
			var index = Math.floor((Math.random() * jutsus.length));
			var total = "===-----------------------------------------------------===".length;

			function center(text) {
				var m = Math.floor((total - text.length) / 2);
				var r = "";
				while (r.length < m) r += " ";
				return r + text;
			}
			if (env.welcome === false) {
				console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
				console.log(center("Koaton: " + jutsus[index].name));
				console.log("   " + "-------------------------===-------------------------".dim + "   ");
				console.log(`   Server running in ${this.proyect_path}\n` +
					`   To see your app, visit ` + `http://localhost:${env.port}\n`.underline +
					`   To shut down Koaton, press <CTRL> + C at any time.`);
				console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
				console.log('   Enviroment:\t\t' + (env.NODE_ENV).green);
				console.log('   Port:\t\t' + (env.port + "").green);
			}
		},
		welcome(env) {
			console.log("Starting Server".grey + " ...".grey.dim);
			var name = "Koaton";
			var ll = name.length > this.version.length ? name.length : this.version.length;
			var spaces = function (text) {
				while (text.length < ll) {
					text += " ";
				}
				return text;
			};
			var fill = function (n) {
				var r = "";
				while (r.length < n) {
					r += " ";
				}
				return r;
			}
			var flame =
				fill(15) + spaces("") + `      :.           `.red + "\n" +
				fill(15) + spaces("") + `    .!>:;         `.red + "\n" +
				fill(10) + spaces("K".gray.bold.italic + "oaton".grey) + fill(5) + `    .!!!!!:.      `.red + "\n" +
				fill(10) + spaces("v" + this.version) + fill(5) + `     .-!!!:;      `.red + "\n" +
				fill(15) + spaces("") + `      ::;>77!.     `.red + "\n" +
				fill(15) + spaces("") + `  -.  !7>7??7:;.   `.red + "\n" +
				fill(15) + spaces("") + ` ;>;.!7?7???7!>>.  `.red + "\n" +
				fill(15) + spaces("") + `;>7;;>?????77777-  `.red + "\n" +
				fill(15) + spaces("") + `;>77!>7????????7:  `.red + "\n" +
				fill(15) + spaces("") + ` ;!777????????7:.  `.red + "\n" +
				fill(15) + spaces("") + `   .-:!!>>!!:;. `.red;

			console.log(
				flame
				.replace(/!/gim, "!".dim.italic.bold)
				.replace(/:/gim, ":".bold)
				.replace(/\?/gim, "?".dim)
				.replace(/\./gim, ".".dim.bold)
			);

		},
		makeHelp(txt) {
			var data = `Version: ${colors.yellow(this.version)}\n` +
				`Command List:\n\n`;
			commands.forEach(function (definition) {
				var args = definition.args.length > 0 ? `<${definition.args.join(" > <")}>` : "";
				var opt = definition.options.length > 0 ? '[options]' : '';
				data += `koaton ${definition.cmd} ${colors.yellow(args)} ${colors.cyan(opt)}\n` +
					`   ${definition.description}\n`;
				definition.options.forEach(function (option) {
					data += `   ${colors.cyan(option[0])}  ${colors.grey(option[1])}\t${option[2]}\n`;
				});
				data += '\n';
			});
			return data;
		},
		center(text) {
			var m = Math.floor((total - text.length) / 2);
			var r = "";
			while (r.length < m) r += " ";
			return r + text;
		},
		version: require('../package.json').version,
		proyect_path: path.resolve(),
		source_path: path.join(__dirname, '..', 'templates'),
		/**
		 * echo str > path.
		 *
		 * @param {String} path
		 * @param {String} str
		 */
		write(file, str, mode) {
			fs.writeFile(file, str, {
				mode: mode || 0666,
			}, (err) => {
				if (err) {
					throw err;
				}
				console.log('   \x1b[36mcreate\x1b[0m : ' + file);
			});
		},
		/**
		 * Check if the given directory `path` is empty.
		 *
		 * @param {String} path
		 * @param {Function} fn
		 */
		load_template(name) {
			return fs.readFileSync(path.join(this.source_path, name), 'utf-8')
		},
		Copy(file) {
			if (!file) {
				throw "check source and destiny paths";
			}
			var str = this.load_template(file);
			return this.write(path.join(this.proyect_path, file), str);
		},
		/**
		 * Check if the given directory `path` is empty.
		 *
		 * @param {String} path
		 * @param {Function} fn
		 */
		Compile(from, options, mode) {
			if (!from) {
				throw "check source and destiny paths";
			}
			var default_options = {
				//				program: program,
				//				application: application
			};
			if (!options)
				options = default_options;
			else {
				for (x in default_options)
					options[x] = default_options[x];
			}
			var str = Handlebars.compile(this.load_template(from))(options);
			return this.write(path.join(this.proyect_path, from), str, mode);
		},
		/**
		 * Mkdir -p.
		 *
		 * @param {String} path
		 * @param {Function} fn
		 */
		mkdir: Promise.promisify(function (path, fn) {
			mkdirp(path, 0755, function (err) {
				if (err) throw err;
				console.log('   \033[36mcreate\033[0m : ' + path);
				fn && fn();
			});
		}),
		/**
		 * Exit with the given `str`.
		 *
		 * @param {String} str
		 */
		abort(str) {
			console.error(str);
			process.exit(1);
		},
		/**
		 *
		 * Check if the given directory `path` is empty.
		 * @param {String} path
		 **/
		isEmpty(path) {
			try {
				var files = fs.readdirSync(path);
				return !files || !files.length;
			} catch (e) {
				return false;
			}
		}
};