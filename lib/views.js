'use strict';

/**
 * Module dependencies.
 */
const config = require(process.cwd() + '/config/views');
const dirname = require('upath').dirname;
const extname = require('upath').extname;
const join = require('path').join;
const cons = require(process.cwd() + '/node_modules/co-views');
const send = require('koa-send');
const fs = require('graceful-fs');
const _stat = fs.stat;
const Handlebars = require(process.cwd() + "/node_modules/handlebars");
const layouts = require(process.cwd() + "/node_modules/handlebars-layouts");

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
			if (err) {
				rej(err);
			}
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
	let templatesDir = join(process.cwd(), "views","layouts");
	Handlebars.registerHelper(layouts(Handlebars));
	Handlebars.registerHelper('bundle',function(bundle){
		const bundles =JSON.parse(fs.readFileSync('./.koaton_bundle',{encoding:'utf-8'}));
		if(bundles[bundle]===undefined){
			return "";
		}
		let res = "";
		if(bundle.indexOf(".css")>-1){
			if(bundles[bundle] instanceof Array){
				console.log(bundle,"isArray");
				bundles[bundle].forEach((file)=>{
					res += `<link rel="stylesheet" href="${file}">`;
				});
			}else{
				console.log(bundle,"isFile");
				res = `<link rel="stylesheet" href="${bundles[bundle]}">`;
			}
		}else if(bundle.indexOf(".js")>-1){
			console.log(bundle,"isJS");
			res= `<script src="${bundles[bundle]}"></script>`;
		}
		return res;
		// if(bundles[bundle].indexOf(".js")>-1){
		// 	return `<script src="${bundles[bundle]}"></script>`;
		// }else{
		// 	return `<link rel="stylesheet" href="${bundles[bundle]}">`;
		// }
	});
	fs.readdirSync(templatesDir).forEach(function(file) {
		if(file.indexOf(".handlebars")>-1){
			Handlebars.registerPartial(file.replace(".handlebars",""), fs.readFileSync(join(templatesDir,file), 'utf8'));
		}
	});

	return function* views(next) {
		if (this.render) {
			return yield next;
		}
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
			render: function*(relPath /*, locals*/ ) {
				// if (locals === null) {
				// locals = {};
				// }
				let ext = (extname(relPath) || '.' + opts.extension).slice(1);
				const paths = yield getPaths(path, relPath, ext)
				var state = this.state; // ? Object.assign(locals, this.state) : {}
				state.env_dev = process.env.NODE_ENV === "development";
				this.type = 'text/html'
				if (isHtml(ext) && !opts.map) {
					yield send(this, paths.rel, {
						root: path
					})
				} else {
					this.body = state.body = yield render(paths.rel, state);
				}
			}
		});
		return yield next;
	}
}
