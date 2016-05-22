'use strict';
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
		if (options.logs) {
			exec(`forever list`).then((data) => {
				data = data.stdout.replace("info:    Forever processes running", "").replace(/ /igm, "-").replace(/data:/igm, "").replace(/-([a-z]|\/|[0-9])/igm, " $1").split('\n');
				data = data.slice(2).map((d) => {
					return d.trim().split(' ')
				});
				for (let i in data) {
					if (data[i].indexOf(options.logs) > -1) {
						return data[i][6];
					}
				}
				return null;
			}).done(id => {
				if (id !== null) {
					exec(`cat ${id}`).then(data => {
						console.log(data.stdout);
					}).finally(() => {
						process.exit(0);
					});
				}
			});
		} else if (options.stop) {
			exec(`forever stop koaton_${path.basename(process.cwd())}`).then(() => {}).finally(() => {
				process.exit(0);
			});
		} else if (options.list) {
			exec(`forever list`).then((data) => {
				data = data.stdout.replace("info:    Forever processes running", "").replace(/ /igm, "-").replace(/data:/igm, "").replace(/-([a-z]|\/|[0-9])/igm, " $1").split('\n');
				var headers = data[1].trim().split(' ').slice(1);
				data = data.slice(2).map((d) => {
					return d.trim().split(' ')
				}).map((d) => {
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
					line[6] = line[6].yellow;
				});
				console.log(headers.join(' ').replace(/-/igm, " "));
				console.log(data.map((d) => {
					if (d[0].indexOf("koaton") > -1) {
						return d.join(' ').replace(/-/igm, " ");
					} else {
						return null;
					}

				}).join('\n'));
			}).finally(() => {
				process.exit(0);
			});
		} else {
			exec(`forever stop koaton_${app}`).catch(() => {}).finally(() => {
				exec(cmd, {
					cwd: process.cwd()
				}).then(() => {
					console.log(`${app} is running ... `);
				}).finally(() => {
					process.exit(0);
				});
			});
		}
	}
};
