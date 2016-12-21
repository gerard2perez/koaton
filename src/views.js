import {
	basename,
	dirname,
	extname
} from 'upath';
import {
	join
} from 'path';
import * as fs from 'fs-extra';
import * as Promise from 'bluebird';
import {sync as glob} from 'glob';

const send = require(ProyPath('node_modules', 'koa-send'))
const config = require(ProyPath('config', 'views'));
const cons = require(ProyPath('node_modules', 'co-views'));
const isHtml = ext => ext === 'html';
const toFile = (fileName, ext) => `${fileName}.${ext}`;
const stat = Promise.promisify(fs.stat);
const npmpackage = require(ProyPath('package.json'));
/**
 * Get the right path, respecting `index.[ext]`.
 * @param  {String} abs absolute path
 * @param  {String} rel relative path
 * @param  {String} ext File extension
 * @return {Object} tuple of { abs, rel }
 */
async function getPaths(abs, rel, ext) {
	try {
		if ((await stat(join(abs, rel))).isDirectory()) {
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
const enginesSetup = {
	handlebars() {
		const Handlebars = require(ProyPath('node_modules', 'handlebars'));
		const layouts = require(ProyPath('node_modules', 'handlebars-layouts'));
		Handlebars.registerHelper(layouts(Handlebars));
		Handlebars.registerHelper('bundle', function(bundle) {
			if (Kmetadata.bundles[bundle] === undefined) {
				return '';
			}
			return Kmetadata.bundles[bundle].toString();
		});
		const layoutFiles = glob(ProyPath('views', 'layouts','*.handlebars')).concat(glob(ProyPath('koaton_modules','**','views', 'layouts','*.handlebars')));
		for (const file of layoutFiles){
			Handlebars.registerPartial(basename(file).replace('.handlebars', ''),fs.readFileSync(file, 'utf8'));
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
	return async function a(ctx, next) {
		if (ctx.render) {
			return await next();
		}
		const render = cons(path, opts);
		let prerender = async function prerender(relPath) {
			let ext = (extname(relPath) || '.' + opts.extension).slice(1);
			const paths = await getPaths(path, relPath, ext)
			var state = ctx.state;
			state.env_dev = process.env.NODE_ENV === 'development';
			ctx.type = 'text/html'
			if (isHtml(ext) && !opts.map) {
				await send(ctx, paths.rel, {
					root: path,
					maxage: 1000 * 60 * 60
				})
			} else {
				ctx.body = state.body = await render(paths.rel, state);
			}
		};
		ctx.render = prerender;
		return await next();
	};
};

export default views;
