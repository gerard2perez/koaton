'use strict';

/**
 * Module dependencies.
 */
const config = require(process.cwd() + '/config/views');
const dirname = require('path').dirname;
const extname = require('path').extname;
const join = require('path').join;
const cons = require('co-views');
const send = require('koa-send');
const _stat = require('fs').stat;

/**
 * Check if `ext` is html.
 * @return {Boolean}
 */

const isHtml = ext => ext === 'html';

/**
 * File formatter.
 */

const toFile = (fileName, ext) => `${fileName}.${ext}`;

/**
 * `fs.stat` promisfied.
 */

const stat = path => {
	return new Promise((res, rej) => {
		_stat(path, (err, stats) => {
			if (err) {rej(err);}
			res(stats)
		})
	})
}

/**
 * Get the right path, respecting `index.[ext]`.
 * @param  {String} abs absolute path
 * @param  {String} rel relative path
 * @param  {String} ext File extension
 * @return {Object} tuple of { abs, rel }
 */

function* getPaths(abs, rel, ext) {
	try {
		const stats = yield stat(join(abs, rel))
		if (stats.isDirectory()) {
			// a directory
			return {
				rel: join(rel, toFile('index', ext)),
				abs: join(abs, dirname(rel), rel)
			}
		}

		// a file
		return {
			rel,
			abs
		}
	} catch (e) {
		// not a valid file/directory
		return {
			rel: toFile(rel, ext),
			abs: toFile(abs, ext)
		}
	}
}

/**
 * Add `render` method.
 *
 * @param {String} path
 * @param {Object} opts (optional)
 * @api public
 */

module.exports = () => {
	var path = config[0];
	var opts = config[1];
	let def = {
		extension: 'html'
	};
	opts = opts === undefined ? def : opts;

	Object.keys(def).forEach((key) => {
		if (opts[key] === undefined) {
			opts[key] = def[key];
		}
	});

	return function* views(next) {
		if (this.render) {return yield next;}
		var render = cons(path, opts)

		/**
		 * Render `view` with `locals` and `koa.ctx.state`.
		 *
		 * @param {String} view
		 * @param {Object} locals
		 * @return {GeneratorFunction}
		 * @api public
		 */

		Object.assign(this, {
			render: function* (relPath, locals) {
				if (locals === null) {
					locals = {};
				}

				let ext = (extname(relPath) || '.' + opts.extension).slice(1);
				const paths = yield getPaths(path, relPath, ext)
				var state = this.state ? Object.assign(locals, this.state) : {}
				state.env_dev = process.env.NODE_ENV === "development";
				this.type = 'text/html'

				if (isHtml(ext) && !opts.map) {
					yield send(this, paths.rel, {
						root: path
					})
				} else {
					state.body = yield render(paths.rel, state);
					console.log(this.layout);
					console.log(!!this.layout);
					console.log(this.layout.length === 0);
					console.log(this.layout === null);
					console.log((!!this.layout && this.layout.length === 0));
					if (this.layout==="" || this.layout === null) {
						console.log("no layout taken");
						this.body = state.body;
					} else {
						console.log("using: " + (this.layout || opts.layout));
						this.body = yield render(this.layout || opts.layout, state);

					}
				}
			}
		});
		return yield next;
	}
}
