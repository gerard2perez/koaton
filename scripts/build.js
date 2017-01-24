require('babel-register');
require('../lib/support/globals');

const glob = require('glob').sync,
	path = require('path'),
	fs = require('fs-extra'),
	Promise = require('bluebird'),
	copy = Promise.promisify(fs.copy),
	promises = [];

let success = 0,
	failed = 0;

function done () {
	success++;
}

function fail () {
	failed++;
}
if (glob('./.koaton').length === 0) {
	for (const bundle of configuration.bundles) {
		for (let globpattern of bundle) {
			glob(globpattern).map(file => {
				promises.push(copy(file, ProyPath('public', file), {preserveTimestamps: true, dereference: true}).then(done, fail));
			});
		}
	}
}

for (const bundle of configuration.static.copy) {
	if (typeof bundle === 'object') {
		for (const pattern of bundle.src) {
			for (const file of glob(pattern)) {
				let filename = file;
				if (bundle.flatten) {
					filename = path.basename(file);
				}
				promises.push(copy(file, ProyPath('public', bundle.dest, filename)).then(done, fail));
			}
		}
	} else {
		for (const file of glob(bundle)) {
			promises.push(copy(file, ProyPath('public', file)).then(done, fail));
		}
	}
}

Promise.all(promises).then(() => {
	console.log(`${success} files copied. ${failed} files failed.`);
});
