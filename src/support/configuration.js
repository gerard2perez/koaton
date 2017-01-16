import { sync as glob } from 'glob';
import { basename, extname } from 'upath';
import BundleItem from './BundleItem';

let isDev = process.env.NODE_ENV === 'development';

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

export default class Configuration {
	constructor () {
		let modules = glob(ProyPath('config', '**', '*.js'));
		let moduleNames = [];
		for (const configFile of modules) {
			let config = requireSafe(configFile, {default: {}}).default;
			const moduleName = basename(configFile).replace(extname(configFile), '');
			moduleNames.push(moduleName);
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
