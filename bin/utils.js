"use strict";
const fs = require('graceful-fs');
const mkdirp = require('mkdirp');
const path = require('upath');
const Promise = require('bluebird');
const spawn = require('cross-spawn');
const spinner = require('./spinner')();
const exec = require('child_process').exec;
let log = "";
exports.koatonPath = path.resolve();
exports.sourcePath = path.join(__dirname, '..', 'templates');
module.exports = {
	log(text){
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text);
	},
	nlog(text){
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(text+'\n');
	},
	no_print:-1,
	print:1,
	spawn:spawn,
	exec:(cmd, opts) => {
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
	},
	shell_log:()=>{
		return log;
	},
	shell: Promise.promisify((display, command, cwd, cb) => {
		let buffer = "";
		let c = null;
		const output = function(data) {
			log += data.toString();
			buffer += data.toString();
			if (buffer.indexOf('\n') > -1) {
				let send = buffer.toString().split('\n');
				spinner.pipe({
					action: "extra",
					msg: send[0].substr(0, 150).replace(/\n/igm, "")
				});
				buffer = "";
			}
		};
		try {
			const child = spawn(command[0], command.slice(1), {
				cwd: path.join(cwd, "/"),
				shell: true
			});
			spinner.start(50, display,undefined,process.stdout.columns).then(() => {
				(cb || (() => {
					console.log("No Callback".red)
				}))(null, c || child.exitCode);
			}, (err) => {
				(cb || (() => {
					console.log("No Callback".red)
				}))(err, c || child.exitCode);
			});
			child.stderr.on('data', output);
			child.stdout.on('data', output);
			child.on('close', function(code) {
				c = code;
				const msg = code === 0 ? `✓`.green : `✗`.red;
				spinner.end(`+ ${display}\t${msg}`.green);
			});
		} catch (err) {
			console.log(err.stack.red);
		}
	}),
	from_env: (() => {
		return path.join(__dirname, '..', 'templates');
	})(),
	to_env: (() => {
		return path.resolve();
	})(),
	version: require('../package.json').version,
	proyect_path: path.resolve(),
	rmdir(folder){
		try {
			fs.unlinkSync(folder);
		} catch (e) {
			return false;
		}
		return true;
	},
	source_path: path.join(__dirname, '..', 'templates'),
	/**
	 * echo str > path.
	 *
	 * @param {String} path
	 * @param {String} str
	 */
	_write: Promise.promisify(fs.writeFile),
	write(file, content, mode) {
		file = path.normalize(file);
		return this._write(file, content, {}).then(() => {
			const head = path.basename(file);
			const body = file.replace(path.join(process.cwd(), "/"), "").replace(head, "");//file.replace(head, "").replace(this.to_env.replace(path.basename(this.to_env), ""), "");
			if(mode!==null){
				console.log(`   ${mode?'update':'create'}`.cyan + ': ' + body + head.green);
			}
			return file;
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
	Compile(text, options) {
		for (let prop in options) {
			text = text.split("{{" + prop + "}}").join(options[prop]);
		}
		return text;
	},
	compile(from, to, options,mode) {
		if (options === undefined) {
			options = to;
			to = undefined;
		}
		to = path.join(this.to_env, to || from);
		return this.read(path.join(this.from_env, from), {
			encoding: this.encoding(path.extname(from))
		}).then((data) => {
			return this.write(to, this.Compile(data, options || {}),mode);
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
	mkdir: Promise.promisify(function(file,mode, cb) {
		file = path.normalize(file);
		if(cb===undefined && typeof mode === "function"){
			cb = mode;
			mode = undefined;
		}
		mode = mode || 1;
		mkdirp(file, '0755', function(err) {
			if (err) {
				throw err;
			}
			const location = file;
			file = file.replace(path.join(process.cwd(), "/"), "");
			const head = path.basename(file);
			if(mode!==-1){
				console.log('   create'.cyan + ': ' + file.replace(head, "") + head.green);
			}
			(cb || (() => {
				console.log("No Callback".red);
			}))(null,location);
		});
	}),
	canAccess(path) {
		try {
			fs.accessSync(path);
			return true;
		} catch (e) {
			return false;
		}
	},
	deleteFolderRecursive(folder) {
		var files = [];
		var that = this;
		if (fs.existsSync(folder)) {
			files = fs.readdirSync(folder);
			files.forEach(function(file) {
				var curPath = path.join(folder, "/", file);
				if (fs.lstatSync(curPath).isDirectory()) { // recurse
					that.deleteFolderRecursive(curPath);
				} else { // delete file
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(folder);
		}
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
