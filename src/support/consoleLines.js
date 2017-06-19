/** @ignore */
const linesize = 59;
/** @ignore */
export function center (text) {
	var m = Math.floor((linesize - text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').length) / 2);
	var r = '';
	while (r.length < m) {
		r += ' ';
	}
	return r + text;
}
/** @ignore */
export function line1 (dodim) {
	let p = linesize - 6;
	let line = '==='.grey;
	let fill = '';
	while (p > 0) {
		fill += '-';
		p--;
	}
	line += dodim ? fill.dim : fill;
	line += '===\n'.grey;
	console.log(line);
}
/** @ignore */
export function line2 () {
	let p = Math.floor((linesize - 3 - 3 - 3) / 2);
	let fill = '';
	while (p > 0) {
		fill += '-';
		p--;
	}
	console.log('   ' + (fill + '===' + fill).dim + '   ');
}
/** @ignore */
export function line3 (text) {
	let p = Math.floor((linesize - 3 - 3 - text.length) / 2);
	let fill = '';
	while (p > 0) {
		fill += '-';
		p--;
	}
	console.log('   ' + (fill + text + fill).dim + '   ');
}
