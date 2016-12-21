'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

const basename = require('upath').basename;

const dirname = require('upath').dirname;

const extname = require('upath').extname;

const join = require('path').join;

const fs = require('fs-extra');

const Promise = require('bluebird');

const glob = require('glob').sync;

const send = require(ProyPath('node_modules', 'koa-send'));
const config = require(ProyPath('config', 'views'));
const cons = require(ProyPath('node_modules', 'co-views'));
const isHtml = ext => ext === 'html';
const toFile = (fileName, ext) => `${ fileName }.${ ext }`;
const stat = Promise.promisify(fs.stat);
const npmpackage = require(ProyPath('package.json'));
/**
 * Get the right path, respecting `index.[ext]`.
 * @param  {String} abs absolute path
 * @param  {String} rel relative path
 * @param  {String} ext File extension
 * @return {Object} tuple of { abs, rel }
 */
function* getPaths(abs, rel, ext) {
	try {
		if ((yield stat(join(abs, rel))).isDirectory()) {
			// a directory
			return {
				rel: join(rel, toFile('index', ext)),
				abs: join(abs, dirname(rel), rel)
			};
		}
		// a file
		return {
			rel,
			abs
		};
	} catch (e) {
		// not a valid file/directory
		return {
			rel: toFile(rel, ext),
			abs: toFile(abs, ext)
		};
	}
}

/**
 * Add `render` method.
 *
 * @param {String} path
 * @param {Object} opts (optional)
 * @api public
 */
const enginesSetup = {
	handlebars() {
		const Handlebars = require(ProyPath('node_modules', 'handlebars'));
		const layouts = require(ProyPath('node_modules', 'handlebars-layouts'));
		Handlebars.registerHelper(layouts(Handlebars));
		Handlebars.registerHelper('bundle', function (bundle) {
			if (Kmetadata.bundles[bundle] === undefined) {
				return '';
			}
			return Kmetadata.bundles[bundle].toString();
		});
		const layoutFiles = glob(ProyPath('views', 'layouts', '*.handlebars')).concat(glob(ProyPath('koaton_modules', '**', 'views', 'layouts', '*.handlebars')));
		for (const file of layoutFiles) {
			Handlebars.registerPartial(basename(file).replace('.handlebars', ''), fs.readFileSync(file, 'utf8'));
		}
	}
};

const avaliableengines = ['handlebars'];

const views = function views() {
	var path = config[0];
	var opts = config[1] || {};
	let def = {
		extension: 'html'
	};
	opts = Object.assign(def, opts);
	const engines = avaliableengines.filter(engine => {
		if (npmpackage.dependencies[engine] !== undefined) {
			return enginesSetup[engine] !== undefined;
		}
		return false;
	});
	for (const engine of engines) {
		enginesSetup[engine]();
	}
	return function* a(next) {
		if (this.render) {
			return yield next;
		}
		const render = cons(path, opts);
		let prerender = function* prerender(relPath) {
			let ext = (extname(relPath) || '.' + opts.extension).slice(1);
			const paths = yield getPaths(path, relPath, ext);
			var state = this.state;
			state.env_dev = process.env.NODE_ENV === 'development';
			this.type = 'text/html';
			if (isHtml(ext) && !opts.map) {
				yield send(this, paths.rel, {
					root: path,
					maxage: 1000 * 60 * 60
				});
			} else {
				this.body = state.body = yield render(paths.rel, state);
			}
		};
		this.render = prerender;
		return yield next;
	};
};

exports.default = views;