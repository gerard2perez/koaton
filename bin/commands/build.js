'use strict';
module.exports = {
	cmd: "build",
	description: "Make bundles of your .js .scss .css files and output to public folder.\n   Default value is ./config/bundles.js",
	args: ["config_file"],
	options: [
		["-p", "--prod", "builds for production"]
	],
	action: function*(config_file, options) {
		config_file = config_file || process.cwd() + '/config/bundles.js';
		var gulp = require('gulp');
		var concat = require('gulp-concat');
		var sourcemaps = require('gulp-sourcemaps');
		var uglify = require('gulp-uglify');
		var hash = require('gulp-hash-filename');
		var patterns = require(config_file);
		if (Object.keys(patterns).length === 0) {
			console.log("Nothing to compile on: " + config_file);
		}
		Object.keys(patterns).forEach(function(key) {
			var info = patterns[key].map(function(file) {
				return path.basename(file).yellow;
			}).join(",".yellow.dim);
			info = "Compiling: ".green + info + " => public/js/" + key.green.bold;
			console.log(info);
			if (!options.prod) {
				gulp.src(patterns[key])
					.pipe(sourcemaps.init())
					.pipe(uglify())
					.pipe(concat(key))
					.pipe(sourcemaps.write())
					.pipe(hash())
					.pipe(gulp.dest('./public/js'));

			} else {
				console.log(options.prod);
			}
		});
	}
};
