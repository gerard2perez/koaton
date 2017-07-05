import * as render from 'consolidate';
import { extname, resolve, basename } from 'upath';
import * as fs from 'fs-extra';
import * as Promise from 'bluebird';
import * as SetUpEngines from './setup';
import debug from '../support/debug';

/** @ignore */
let avaliableEngines = Object.keys(render);
avaliableEngines.splice(avaliableEngines.indexOf('requires'), 1);
/** @ignore */
const testedEngines = [ 'handlebars', 'nunjucks' ],
	npmpackage = require(ProyPath('package.json')),
	exists = function (target) {
		try {
			fs.accessSync(target, fs.constants.R_OK);
			return true;
		} catch (err) {
			return false;
		}
	};
	/* istanbul ignore next */
if (Object.keys(npmpackage.dependencies).indexOf('mongoose') > -1) {
	require(ProyPath('node_modules', 'mongoose')).Promise = require('bluebird');
}
/** @ignore */
let extMapper = {
		'': 'html',
		'njk': 'nunjucks'
	},
	cacher = {};
/**
* This function return the correct enginge for the path provided
* path  engine is stored in a cache
* @param {String} fullpath - filename to render
* @return {engine}
*/
function ex2engine (fullpath) {
	let extension = extname(fullpath).slice(1);
	let file = fullpath.replace(extname(fullpath), '');
	let engine;
	if (!extension && !cacher[fullpath] && !exists(fullpath)) {
		for (const engineExt of testedEngines) {
			/* istanbul ignore else */
			if (exists(`${file}.${engineExt}`)) {
				extension = engineExt;
				break;
			}
		}
	}
	if (!cacher[fullpath]) {
		engine = extMapper[extension] || extension;
		let path = `${file}.${extension}`;
		if (testedEngines.indexOf(engine) === -1 && avaliableEngines.indexOf(engine) > -1 && engine !== 'html') {
			console.warn(`${engine} engine is avaliable but not tested`);
		} else if (avaliableEngines.indexOf(engine) === -1 && engine !== 'html') {
			throw Error(`${engine} engine is not supported`);
		}
		cacher[fullpath] = [engine, path];
	}
	return cacher[fullpath];
}
for (const engine of avaliableEngines) {
	if (npmpackage.dependencies[engine] !== undefined && SetUpEngines[engine] !== undefined) {
		render.requires[engine] = SetUpEngines[engine]();
		if (configuration.views[engine] !== undefined) {
			configuration.views[engine](render.requires[engine]);
		}
	}
}
/**
* This function return the correct enginge for the path provided
* path  engine is stored in a cache
* @param {String} file - relative to views/
* @return {Object}
*/
function template (file, locals = {}) {
	let fullpath = resolve('views', file);
	const [engine, target] = ex2engine(fullpath);
	if (engine !== 'html') {
		return render[engine](target, locals);
	} else {
		return new Promise(function (resolve, reject) {
			try {
				fs.accessSync(target, fs.constants.R_OK);
				resolve(fs.readFileSync(target, 'utf-8'));
			} catch (err) {
				/* istanbul ignore next */
				reject(err);
			}
		});
	}
}
/**
 * Sets up some of the initial values
 * @param {Object} options={} - you can pass custom mapping for extname <--> engine relation
 */
export function initialize (/* istanbul ignore next */ options = {}) {
	extMapper = Object.assign({}, extMapper, options.extensions);
}
/**
 * This middleware allows you to render or return send files
 * and appends ctx.send ad ctx.render
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 * @param {JSURL} ctx.send - function(file: String) reference attached.
 * @param {JSURL} ctx.render - function(file: String, locals: Object)reference attached.
 */
export async function viewsMiddleware (ctx, next) {
	ctx.send = async (file) => {
		ctx.type = extname(basename(file));
		ctx.body = fs.createReadStream(file);
		ctx.state.nocache = false;
	};
	ctx.render = async function (file, locals) {
		try {
			ctx.body = await template(file, locals);
			ctx.state.nocache = false;
		} catch (err) {
			debug(err);
			ctx.status = 500;
		}
	};
	await next();
}
