const configmodules = ['server', 'bundles', 'connections', 'copy', 'ember', 'inflections', 'models', 'security', 'views'];
export default class Configuration {
	constructor () {
		global.configuration = {};
		for (const config of configmodules) {
			global.configuration[config] = require(ProyPath('config', config));
			const configuration = global.configuration;
			global.configuration = {};
			makeObjIterable(configuration);
			for (const configfile of configuration) {
				for (const configvalue in configfile) {
					Object.defineProperty(this, configvalue, {
						configurable: process.env.NODE_ENV === 'development',
						enumerable: true,
						get () {
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
