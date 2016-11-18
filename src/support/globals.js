import * as rawpath from 'path';
import * as path from 'upath';
import configuration from './configuration';

global.makeObjIterable = function makeObjIterable(obj) {
	obj[Symbol.iterator] = function() {
		let keys = Object.keys(this),
			index = -1;
		return {
			next: () => ({
				value: this[keys[++index]],
				done: !(index < keys.length)
			})
		};
	};
}
global.cleanString = (text) => {
	return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
};
global.requireSafe = function requireSafe(lib, defaults) {
	try {
		return require(lib);
	} catch (e) {
		if (defaults === undefined) {
			console.log(e.stack);
		}
		return defaults;
	}
}
global.requireNoCache = function requireNoCache(lib, defaults) {
	let library = rawpath.normalize(rawpath.resolve(lib));
	if (library.indexOf(".json") === -1) {
		library = library.replace(".js", "") + ".js";
	}
	delete require.cache[library];
	return requireSafe(library, defaults);
}
global.ProyPath = function(...args) {
	args.splice(0, 0, process.cwd());
	return path.normalize(path.join.apply(path, args));
};
global.scfg = new configuration();
