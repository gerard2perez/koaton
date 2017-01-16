import * as rawpath from 'path';
import * as path from 'upath';
import Configuration from './configuration';
import { sync as glob } from 'glob';
import BundleItem from './BundleItem';

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
 * Makes a require with no errors or return defaults.
 * @function requireSafe
 * @param {String} lib - path to require.
 * @param {Object=} [defaults={}] - Object to return if require fails.
 * @returns {Object} The required library.
 */
global.requireSafe = function requireSafe (lib, defaults = {}) {
	try {
		return require(lib);
	} catch (e) {
		console.log(e);
		return defaults;
	}
};

/**
 * Makes a require with no cache. If fails return defaults.
 * @function requireNoCache
 * @param {String} lib - path to require.
 * @param {Object=} [defaults={}] - Object to return if require fails.
 * @returns {Object} The required library (always) fresh.
 */
global.requireNoCache = function requireNoCache (lib, defaults) {
	let library = rawpath.normalize(rawpath.resolve(lib));
	if (library.indexOf('.json') === -1) {
		library = library.replace('.js', '');// + '.js';
	}
	delete require.cache[library];
	return requireSafe(library, defaults);
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
try {
	let raw = requireNoCache(ProyPath('config', 'bundles')).default;
	let bundles = {};
	for (const bundle in raw) {
		bundles[bundle] = [];
		for (const idx in raw[bundle]) {
			bundles[bundle] = bundles[bundle].concat(glob(raw[bundle][idx]));
		}
	}
	for (const bundle in bundles) {
		Kmetadata.bundles[bundle] = new BundleItem(bundle, bundles[bundle]);
	}
} catch (e) {
	// do nothing
}
