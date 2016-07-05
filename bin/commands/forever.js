'use strict';
const path = require('upath');
const exec = require('../utils').exec;
const list = function*() {
	let data = yield exec(`forever list`, {});
	data = data.stdout.replace("info:    Forever processes running", "").replace(/ /igm, "-").replace(/data:/igm, "");
	let fix = (new RegExp(/"[^"]*"/igm)).exec(data);
	if (fix !== null) {
		fix.forEach(function(pattern) {

			data = data.replace(pattern, pattern.replace(/"/igm, "").replace("-", "_"));
		});
		data = data.replace(/-([a-z]|\/|[0-9])/igm, " $1").split('\n');
	} else {
		console.log();
		console.log("No forever processes running");
		console.log();
	}
	return {
		hasProcess: fix !== null,
		header: fix !== null ? data[1].trim().split(' ').slice(1) : [],
		data: fix !== null ? data.slice(2).map((d) => {
			return d.trim().split(' ')
		}) : []
	}
}
module.exports = {
	cmd: "forever",
	description: "Runs your awsome Koaton on production mode with forever.",
	args: [],
	options: [
		["-l", "--list", "Lists all Koaton running applicactions."],
		["-o", "--logs <app>", "Shows the logs for the selected app."],
		["-s", "--stop", "Stops all the forever running servers."],
		["--port", "--port <port>", "(Default: 62626) Run on the especified port (port 80 requires sudo)."]
	],
	action: function*(options) {
		const env = {
			welcome: false,
			NODE_ENV: 'production',
			port: options.port || 62626
		};
		const app = path.basename(process.cwd());
		const cmd = `NODE_ENV=${env.NODE_ENV} port=${env.port} forever start --colors --uid "koaton_${app}" -a app.js`;
		const cmdwin = `cmd /c "set NODE_ENV=production & set port=${env.port} & forever start --colors --uid \"koaton_${app}\" -a app.js"`;
		if (options.logs) {
			let f_list = yield list();
			let id = null;
			if (f_list.hasProcess) {
				for (let i in f_list.data) {
					if (f_list.data[i].indexOf(`koaton_${options.logs}`) > -1) {
						id = f_list.data[i][6];
						break;
					}
				}
				if (id !== null) {
					console.log((yield exec(`cat ${id}`,{})).stdout);
				}
			}
		} else if (options.stop) {
			yield exec(`forever stop koaton_${path.basename(process.cwd())}`, {});
		} else if (options.list) {
			let f_list = yield list();
			if (f_list.hasProcess) {
				let headers = f_list.header;
				let data = f_list.data.map((d) => {
					return d.slice(1);
				});
				headers[0] = headers[0].green;
				headers[1] = headers[1].gray.dim;
				headers[2] = headers[2].gray.dim;
				headers[3] = headers[3].gray.dim;
				headers[4] = headers[4].cyan;
				headers[5] = headers[5].gray.dim;
				headers[6] = headers[6].magenta;
				headers[7] = headers[7].yellow;
				data.pop();
				data.forEach((line) => {
					line[0] = line[0].green;
					line[1] = line[1].gray.dim;
					line[2] = line[2].gray.dim;
					line[3] = line[3].gray.dim;
					line[4] = line[4].cyan;
					line[5] = line[5].magenta;
					if (!line[6]) {
						line[6] = line[5].yellow;
						line[5] = line[6].yellow;
					} else {
						line[6] = line[6].yellow;
					}

				});
				console.log(headers.join(' ').replace(/-/igm, " "));
				console.log(data.map((d) => {
					if (d[0].indexOf("koaton") > -1) {
						return d.join(' ').replace(/-/igm, " ");
					} else {
						return null;
					}

				}).join('\n'));
			}
		} else {
			let err = null;
			try {
				yield exec(`forever stop koaton_${app}`, {});
			} catch (e) {
				err = null;
			}
			try {
				yield exec(cmd, {});
			} catch (e) {
				err = e;
			}
			try {
				yield exec(cmdwin, {});
			} catch (e) {

				err = e;
			}
			console.log(`${app} is running ... `);
		}
		return 0;
	}
};
