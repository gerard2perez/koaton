import { sync as glob } from 'glob';
import { basename, extname } from 'upath';
import BundleItem from './BundleItem';

/** @ignore */
let isDev = process.env.NODE_ENV === 'development';
/**
 * Creates an object based on its dev prod properties and merges them accordint to
 * the current NODE_ENV
 * This function is recursive and will transform the hole object
 * @private
 * @param {Object} object - target object to transform
 * @param {String} prop - the property to look at
 * @example {a:{dev:0,prod:1}} if NODE_ENV = 'development' -> {a:0}
 */
function DeepDevOrProd (object, prop) {
	let target = object[prop];
	if (Object.keys(target).indexOf('dev') === -1 && typeof target === 'object') {
		for (const deep of Object.keys(target)) {
			DeepDevOrProd(object[prop], deep);
		}
	} else {
		if (Object.keys(target).indexOf('dev') === -1) {
			object[prop] = target;
		} else {
			object[prop] = isDev ? target.dev : /* istanbul ignore next */ target.prod;
		}
	}
}

/**
 * Reads all the configuration files located at config/*.js and merges them into a single object
 * respecting their namespace
 * @class Configuration
 */
export default class Configuration {
	/** @ignore */
	constructor () {
		/** @type {Object} */
		this.bundles = null;
		/** @type {Object} */
		this.conections = null;
		/** @type {Object} */
		this.ember = null;
		/** @type {Object} */
		this.inflections = null;
		/** @type {Object} */
		this.security = null;
		/** @type {Object} */
		this.server = null;
		/** @type {Object} */
		this.static = null;
		/** @type {Object} */
		this.views = null;
		let modules = glob(ProyPath('config', '**', '*.js'));
		let moduleNames = [];
		for (const configFile of modules) {
			let config = require(configFile).default;
			const moduleName = basename(configFile).replace(extname(configFile), '');
			moduleNames.push(moduleName);
			/** @ignore */
			this[moduleName] = config;
		}
		for (const bundle in this.bundles) {
			this.bundles[bundle] = new BundleItem(bundle, this.bundles[bundle]);
		}
		moduleNames.splice(moduleNames.indexOf('bundles'), 1);
		for (const moduleconfig of moduleNames) {
			DeepDevOrProd(this, moduleconfig);
			Object.freeze(this[moduleconfig]);
		}
		makeObjIterable(this.security.strategies);
		makeObjIterable(this.bundles);
	}
}
