"use strict";
var spinners = [
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
    ".oO@*",
    ["◡◡", "⊙⊙", "◠◠"],
    ["◜ ", " ◝", " ◞", "◟ "],
    "◇◈◆",
    "⣾⣽⣻⢿⡿⣟⣯⣷",
    "⠁⠂⠄⡀⢀⠠⠐⠈",
    [">))'>", " >))'>", "  >))'>", "   >))'>", "    >))'>", "   <'((<", "  <'((<", " <'((<"],
    ["    /\\O\n     /\\/\n    /\\\n   /  \\\n LOL  LOL", "     _O\n   //|_\n    |\n   /|\n   LLOL", "      O\n     /_\n     |\\\n    / |\n  LOLLOL"],
];
let pipeval = {
	action: "start",
	id: ""
};
const pipe = (str) => {
	if (!!str) {
		pipeval = str;
	} else {
		let p = pipeval;
		pipeval = {};
		//		return pipeval;
		return p;
	}

};

const co = require('co');
const spinner = co.wrap(function* (interval, text, extra) {
	extra = extra === undefined ? "" : extra;
	const spin = "◐◓◑◒";
	const l = spin.length;
	let current = -1;
	let prom = new Promise(function (resolve, reject) {
		let i = null;
		i = setInterval(() => {
			try {
				let pip = pipe();
				switch (pip.action) {
				case "end":
					clearInterval(i);
					i = null;
					if (pip.id !== undefined) {
						process.stdout.clearLine();
						process.stdout.cursorTo(0);
						process.stdout.write(pip.id);
					}
					process.stdout.write("\n");
					resolve(true);
					break;
				case "text":
					text = pip.id;
					break;
				case "extra":
					extra = pip.id;
				default:
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					current++
					if (current >= l) {
						current = 0;
					}
					process.stdout.write(spin[current].green.bold + "\t" + text + "\t" + extra);
					break;
				}
			} catch (e) {
				//				console.log(e);
			}
		}, interval);
	});
	return yield prom;
});
const close = (msg) => {
	pipe({
		action: "end",
		id: msg
	});
}

exports.start = spinner;
exports.pipe = pipe;
exports.end = close;