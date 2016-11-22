'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

const include = require('./include').default;

const fs = require('fs-extra');

const configmodules = ['server', 'bundles', 'connections', 'copy', 'ember', 'inflections', 'models', 'security', 'views'];
class Configuration {
	constructor() {
		global.configuration = {};
		for (const config of configmodules) {
			global.configuration[config] = require(ProyPath('config', config));
		}
		// while (reload.length > 0 && idx < reload.length) {
		// 	let file = reload[idx].replace(".js","");
		// 	try {
		// 		let config = require(ProyPath('config', file));
		// 		reload.splice(idx, 1);
		// 		global.configuration[file]=config;
		// 	} catch (e) {
		// 		idx++;
		// 	}
		// }
		// let configuration = include(ProyPath('config'));
		const configuration = global.configuration;

		makeObjIterable(configuration);
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
				});
			}
		}
	}
}
exports.default = Configuration;