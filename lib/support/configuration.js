'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
const configmodules = ['server', 'bundles', 'connections', 'copy', 'ember', 'inflections', 'models', 'security', 'views'];
class Configuration {
	constructor() {
		global.configuration = {};
		for (const config of configmodules) {
			console.log(ProyPath('config', config));
			global.configuration[config] = require(ProyPath('config', config));
			const configuration = global.configuration;
			global.configuration = {};
			makeObjIterable(configuration);
			for (const configfile of configuration) {
				for (const configvalue in configfile) {
					Object.defineProperty(this, configvalue, {
						enumerable: true,
						get() {
							if (configfile[configvalue].dev && configfile[configvalue].prod) {
								return process.env.NODE_ENV === 'development' ? configfile[configvalue].dev : configfile[configvalue].prod;
							} else {
								return configfile[configvalue];
							}
						}
					});
				}
			}
		}
	}
}
exports.default = Configuration;