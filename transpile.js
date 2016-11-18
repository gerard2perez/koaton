const Promise = require('bluebird');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('upath');
const babel = require("babel-core");

fs.emptyDirSync('lib');

const transpilepaths = [
		"src/**/*.js"
	],
	transform = Promise.promisify(babel.transformFile, {
		context: babel
	}),
	writeFile = Promise.promisify(fs.writeFile);

let converting = [];
const koav1 = function(fullname) {
	let file = path.basename(fullname),
		route = fullname.replace(file, "").replace("src", "lib");
	fs.ensureDirSync(route);
	converting.push(transform(fullname, {
		babelrc: false,
		plugins: [
			"babel-plugin-transform-koaton-es6-modules",
			"babel-plugin-transform-koa2-async-to-generator"
		]
	}).then((content) => {
		return writeFile(path.join(route, file), content.code, {});
	}));
}

let transpiler = () => {};
switch (process.argv[2]) {
	case "v1":
		transpiler = koav1;
		break;
	default:
		break;
}
for (const globpath of transpilepaths) {
	for (const source of glob.sync(globpath)) {
		transpiler(source);
	}
}

Promise.all(converting).then(() => {
	console.log("All files converted");
});
