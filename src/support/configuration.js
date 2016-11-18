import include from './include';

export default class Configuration {
	constructor() {
		let configuration = include(ProyPath('config'));
		for (const configfile of configuration) {
			for (const configvalue in configfile) {
				Object.defineProperty(this, configvalue, {
					get() {
						if (configfile[configvalue].dev && configfile[configvalue].prod) {
							return process.env.NODE_ENV === "development" ? configfile[configvalue].dev : configfile[configvalue].prod;
						} else {
							return configfile[configvalue];
						}
					}
				})
			}
		}
	}
}
