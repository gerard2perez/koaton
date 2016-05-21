"use strict";
const fs = require('fs');
const mkdirp = require('mkdirp');
const Handlebars = require('handlebars');
const path = require('path');
const Promise = require('bluebird');
const spawn = require('cross-spawn-async');
const spinner = require('./spinner');
const exec = require('child_process').exec;
exports.exec = (cmd, opts) => {
	return new Promise((resolve, reject) => {
		const child = exec(cmd, opts, (err, stdout, stderr) => err ? reject(err) : resolve({
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
exports.koatonPath = path.resolve();
exports.sourcePath = path.join(__dirname, '..', 'templates');
module.exports = {
	shell: Promise.promisify((display, command, cwd, cb) => {
		let c = null;
		let buffer = "";
		const child = spawn(command[0], command.slice(1), {
			cwd: path.join(cwd, "/"),
			shell: true
		});
		spinner.start(50, display).then(() => {
			cb && cb(null, c || child.exitCode);
		}, (err) => {
			cb && cb(err, c || child.exitCode);
		});
		child.stderr.on('data', (data) => {
			//		console.log(data.toString());
		});
		child.stdout.on('data', (data) => {
			buffer += data.toString();
			if (buffer.indexOf('\n') > -1) {
				let send = buffer.toString().split('\n');
				spinner.pipe({
					action: "extra",
					id: send[0].substr(0, 150).replace(/\n/igm, "")
				});
				buffer = "";
			}
		});
		child.on('close', function(code, signal) {
			c = code;
			const msg = code === 0 ? `✓`.green : `✗`.red;
			spinner.end(`+ ${display}\t${msg}`.green);
		});
	}),
	from_env: (()=>{return path.join(__dirname, '..', 'templates');})(),
	to_env: (()=>{return path.resolve();})(),
	info(env, promises) {
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
				Promise.all(promises).then((a) => {
					console.log(a.join('\n'));
					console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
					console.log('   Enviroment:\t\t' + (env.NODE_ENV).green);
					console.log('   Port:\t\t' + (env.port + "").green);
				});
			}
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
		return this._write(file, content, {}).then(() => {
			var head = path.basename(file);
			var body = file.replace(head, "").replace(this.to_env.replace(path.basename(this.to_env), ""), "");
			console.log(`   ${mode?'update':'create'}`.cyan + ': ' + body + head.green);
			return true;
		}, (e) => {
			console.log(e.toString().red);
		}).catch((e) => {
			console.log(e.toString().red);
			return false;
		});
	},
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
	mkdir: Promise.promisify(function(file, fn) {
		mkdirp(file, '0755', function(err) {
			if (err) throw err;
			file = file.replace(path.join(process.cwd(),"/"), "");
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
			return true;
		}
	}
};
