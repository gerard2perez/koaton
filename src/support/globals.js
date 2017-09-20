import * as rawpath from 'path';
import * as path from 'upath';
import Configuration from './configuration';
import { sync as glob } from 'glob';
import BundleItem from './BundleItem';
import * as fs from 'fs';

/**
 * Makes and Object iterable.
 * @function makeObjIterable
 * @param {Object} obj - The object to bind the 'of' iterator.
 */
global.makeObjIterable = function makeObjIterable (obj) {
	obj[Symbol.iterator] = function () {
		let keys = Object.keys(this),
			index = -1;
		return {
			next: () => ({
				value: this[keys[++index]],
				done: !(index < keys.length)
			})
		};
	};
};

/**
 * Removes any color characters.
 * @function cleanString
 * @param {string} text - Text to be formated.
 * @returns {string} String with no console colors.
 */
global.cleanString = (text) => {
	return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};

/**
 * Makes a require with no cache. If fails return defaults.
 * @function requireNoCache
 * @param {String} lib - path to require.
 * @param {Object=} [defaults={}] - Object to return if require fails.
 * @returns {Object} The required library (always) fresh.
 */
global.requireNoCache = function requireNoCache (lib) {
	let library = rawpath.normalize(rawpath.resolve(lib));
	if (library.indexOf('.json') === -1) {
		library = library.replace('.js', ''); // + '.js';
	}
	delete require.cache[library];
	return require(library);
};

/**
 * Creates a path relative to current project root.
 * @function ProyPath
 * @param {...String} args - path relative to current project root;
 * @returns {Object} The required library (always) fresh.
 */
global.ProyPath = function (...args) {
	args.splice(0, 0, process.cwd());
	return path.normalize(path.join.apply(path, args));
};

// TODO I don't like this here
process.env.NODE_PATH = path.join(process.cwd(), 'node_modules');
require('module').Module._initPaths();

/**
 * @global
 * @var {Configuration} configuration
 * @readonly
 */
global.configuration = new Configuration();

/**
 * @global
 * @var {Object} Kmetadata
 * @property {module:support/BundleItem.default[]} bundles
 * @readonly
 */
global.Kmetadata = {
	bundles: {}
};
if (glob('./.koaton').length === 1) {
	let koaton = JSON.parse(fs.readFileSync(ProyPath('.koaton'), 'utf-8'));
	for (const bundle of Object.keys(koaton.bundles)) {
		Kmetadata.bundles[bundle] = new BundleItem(bundle, koaton.bundles[bundle]);
	}
} else {
	for (const bundle of configuration.bundles) {
		let AllFiles = [];
		for (const pattern of bundle) {
			AllFiles = AllFiles.concat(glob(pattern));
		}
		AllFiles = AllFiles.map((f) => {
			return f.replace(ProyPath(), '');
		});
		Kmetadata.bundles[bundle.file] = new BundleItem(bundle.file, AllFiles);
	}
}
