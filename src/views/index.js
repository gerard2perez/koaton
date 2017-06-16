import * as render from 'consolidate';
import { extname, resolve, basename } from 'upath';
import * as fs from 'fs-extra';
import * as Promise from 'bluebird';
import SetUpEngines from './setup';
import debug from '../support/debug';

let avaliableEngines = Object.keys(render);
avaliableEngines.splice(avaliableEngines.indexOf('requires'), 1);
const testedEngines = [ 'handlebars', 'nunjucks' ];
const npmpackage = require(ProyPath('package.json'));
if (Object.keys(npmpackage.dependencies).indexOf('mongoose') > -1) {
	require('mongoose').Promise = require('bluebird');
}
const exists = function (target) {
	try {
		fs.accessSync(target, fs.constants.R_OK);
		return true;
	} catch (err) {
		return false;
	}
};

let extMapper = {
	'': 'html',
	'njk': 'nunjucks'
};
let cacher = {};
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

const template = function (file, locals = {}) {
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
};
async function views (ctx, next) {
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
function initialize (/* istanbul ignore next */ options = {}) {
	extMapper = Object.assign({}, extMapper, options.extensions);
	return views;
}

export default initialize;
