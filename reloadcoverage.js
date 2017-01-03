const chokidar = require('chokidar');
const livereload = require('gulp-livereload');
const fs = require('fs-extra');
const glob = require('glob');

function test () {
	let script = '<script src="http://localhost:62627/livereload.js?snipver=1"></script>\n</body>';
	glob.sync('coverage/**/*.html').forEach((file) => {
		let index = fs.readFileSync(file, 'utf-8').replace('</body>', script);
		fs.writeFileSync(file, index, 'utf-8');
	});
	livereload.reload();
}
var sourcewatcher = chokidar.watch(['coverage/lcov.info'], {
	persistent: true,
	ignoreInitial: true,
	alwaysStat: false,
	awaitWriteFinish: {
		stabilityThreshold: 200,
		pollInterval: 90
	}
});
sourcewatcher.on('add', () => test()).on('change', () => test());
livereload.listen({
	port: 62627,
	quiet: true
});
test();
