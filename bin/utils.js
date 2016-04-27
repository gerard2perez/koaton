//"use strict";
const fs = require('fs');
const mkdirp = require('mkdirp');
const Handlebars = require('handlebars');
const path = require('path');
const Promise = require('bluebird');
const colors = require('colors');

module.exports.utils = {
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
			if (env.NODE_ENV !== 'production') {
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
			}
		},
		from_env: path.join(__dirname, '..', 'templates'),
		to_env: path.resolve(),
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
			if (env.NODE_ENV !== 'production') {
				console.log(
					flame
					.replace(/!/gim, "!".dim.italic.bold)
					.replace(/:/gim, ":".bold)
					.replace(/\?/gim, "?".dim)
					.replace(/\./gim, ".".dim.bold)
				);
			}
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
		_write: Promise.promisify(fs.writeFile),
		write(file, content, mode) {
			return this._write(file, content, mode).then(() => {
				var head = path.basename(file);
				var body = file.replace(head, "").replace(this.to_env.replace(path.basename(this.to_env), ""), "");
				console.log('   create'.cyan + ': ' + body + head.green);
				return true;
			}).catch((e) => {
				console.log(e.red);
				return false;
			});
		},
		glob: Promise.promisify(require('node-glob')),
		/**
		 * Check if the given directory `path` is empty.
		 *
		 * @param {String} path
		 * @param {Function} fn
		 */
		encoding: (ext) => {
			switch (ext) {
			case ".png":
			case ".jpg":
				return null;
			default:
				return "utf-8";
			}
		},
		copy(from, to) {
			to = path.join(this.to_env, to || from);
			from = path.join(this.from_env, from);
			return this.read(from, {
				encoding: this.encoding(path.extname(from))
			}).then((data) => {
				return this.write(to, data);
			}).catch((e) => {
				console.log(e.red);
				return false;
			});
		},
		read: Promise.promisify(fs.readFile),
		compile(from, to, options) {
			if (options === undefined) {
				options = to;
				to = undefined;
			}
			to = path.join(this.to_env, to || from);
			return this.read(path.join(this.from_env, from), {
				encoding: this.encoding(path.extname(from))
			}).then((data) => {
				return this.write(to, Handlebars.compile(data)(options || {}));
			}).catch((e) => {
				console.log(e.red);
				return false;
			});

		},
		/**
		 * Mkdir -p.
		 *
		 * @param {String} path
		 * @param {Function} fn
		 */
		mkdir: Promise.promisify(function (file, fn) {
			mkdirp(file, 0755, function (err) {
				if (err) throw err;

				file = file.replace(process.cwd() + "/", "");
				var head = path.basename(file);
				file = file.replace(head, "");

				console.log('   create'.cyan + ': ' + file + head.green);
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