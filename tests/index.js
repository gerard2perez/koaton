const nodemon = require('gulp-nodemon');
const notifier = require('node-notifier');
process.stdout.write('clear');
process.stdout.write('\x1Bc');
var app = nodemon({
	ext: '*',
	quiet: true,
	delay: 500,
	ignore: [
		"**/node_modules/**", "**/bower_components/**"
	],
	verbose: false,
	script: './tests/test.js',
//	env: env,
	stdout: true
}).once('start', function () {
	notifier.notify({
		title: 'Koaton',
		message:"hola",
//		message: 'Server runnung on localhost:' + env.port,
//		open: "http://localhost:" + env.port,
//		icon: path.join(__dirname, 'koaton.png'),
		sound: 'Hero',
		wait: false
	});
}).on('restart', function (a, b) {
//	setTimeout(function () {
//		livereload.reload();
//	}, 1000);
	notifier.notify({
		title: 'Koaton',
		message: 'restarting server...',
//		icon: path.join(__dirname, 'koaton.png'),
		sound: 'Hero',
	});
});