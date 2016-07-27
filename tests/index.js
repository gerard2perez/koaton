"use strict";
const nodemon = require('nodemon');
const notifier = require('node-notifier');
const path = require('path');
// process.stdout.write('clear');
// process.stdout.write('\x1Bc');
if(process.argv[2]!==undefined){
	nodemon({
		ext: '*',
		quiet: true,
		delay: 500,
		ignore: [
			"**/node_modules/**", "**/bower_components/**","**/running_test/**",
			"tests/index.js"
		],
		verbose: false,
		script: './tests/test.js',
	//	env: env,
		stdout: true
	}).once('start', function () {
		notifier.notify({
			title: 'Koaton',
			message:'Live Development Started',
			icon: path.join(process.cwd(), 'bin/koaton.png'),
			sound: 'Hero',
			wait: false
		});
	}).on('restart', function () {
		notifier.notify({
			title: 'Koaton',
			message: 'Restarting Tests',
			icon: path.join(process.cwd(), 'bin/koaton.png'),
			sound: 'Hero'
		});
	});
}else{
	require("./test");
}
