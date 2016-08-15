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
const os = require('os').platform();
const co = require('co');
const spinner = co.wrap(function(interval, text, extra,size) {
	extra = extra === undefined ? "" : extra;
	const that = this;
	const spin = os === 'win32' ? spinners[10]:spinners[9];
	const l = spin.length;
	let current = -1;
	that.text = text || "";
	that.extra = extra || "";
	that.size = size;
	return new Promise(function(resolve) {
		that.promise = resolve;
		that.id = setInterval(() => {
			try {
				try {
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
				} catch (e) {
					//process.stdout.write("TODO: clearLine undefined (1)");
				}
				current++
				if (current >= l) {
					current = 0;
				}
				process.stdout.write(spin[current].green.bold + "\t" + that.text + "\t" + that.complent);
			} catch (e) {
				console.log(e.stack.yellow);
			}
		}, interval);
	});
});

class spin {
	get printleft(){
		return this.size - this.text.length-8-10;
	}
	get complent(){
		if(this.extra.length>this.printleft){
			return this.extra.substr(0,this.printleft-2)+".."
		}
		return this.extra;
	}
	constructor() {
		this.start = spinner.bind(this);
	}
	end(msg) {
		this.pipe({
			action: "close",
			msg: msg
		});
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
					try {
						process.stdout.clearLine();
						process.stdout.cursorTo(0);
					} catch (e) {
						//process.stdout.write("TODO: clearLine undefined");
					}
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

module.exports = () => {
	return new spin();
};
/*exports.start = spinner;
exports.pipe = pipe;
exports.end = close;*/
