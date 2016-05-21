"use strict";
require("colors");
const spinners = [
	"←↖↑↗→↘↓↙",
	"▁▃▄▅▆▇█▇▆▅▄▃",
	"▉▊▋▌▍▎▏▎▍▌▋▊▉",
	"▖▘▝▗",
	"▌▀▐▄",
	"┤┘┴└├┌┬┐",
	"◢◣◤◥",
	"◰◳◲◱",
	"◴◷◶◵",
	"◐◓◑◒",
	"|/-\\",
	".oO@*", ["◡◡", "⊙⊙", "◠◠"],
	["◜ ", " ◝", " ◞", "◟ "],
	"◇◈◆",
	"⣾⣽⣻⢿⡿⣟⣯⣷",
	"⠁⠂⠄⡀⢀⠠⠐⠈", [">))'>", " >))'>", "  >))'>", "   >))'>", "    >))'>", "   <'((<", "  <'((<", " <'((<"]
];
const co = require('co');
const spinner = co.wrap(function*(interval, text, extra) {
	extra = extra === undefined ? "" : extra;
	const that = this;
	const spin = spinners[9];
	const l = spin.length;
	let current = -1;
	that.text = text || "";
	that.extra = extra || "";
	return new Promise(function(resolve, reject) {
		that.promise = resolve;
		that.id = setInterval(() => {
			try {
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				current++
				if (current >= l) {
					current = 0;
				}
				process.stdout.write(spin[current].green.bold + "\t" + that.text + "\t" + that.extra);
			} catch (e) {
				console.log(e.stack.yellow);
			}
		}, interval);
	});
});

class spin {
	constructor() {
		this.start = spinner.bind(this);
	}
	end(msg){
		this.pipe({action:"close",msg:msg});
	}
	pipe(msg) {
		if (msg !== undefined && msg !== null) {
			switch (msg.action) {
				case "text":
					this.text = msg.msg;
					break;
				case "extra":
					this.extra = msg.msg;
					break;
				case "close":
					clearInterval(this.id);
					this.id = null;
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write(msg.msg);
					process.stdout.write("\n");
					this.promise(true);
					break;
				default:
					console.log("spinner message not recognized");
					console.log(msg);
					break;
			}
		}
	}
}

module.exports = (() => {
	return new spin();
})();
/*exports.start = spinner;
exports.pipe = pipe;
exports.end = close;*/
