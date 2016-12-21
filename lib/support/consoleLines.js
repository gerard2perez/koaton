'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
const linesize = 59;
const center = function center(text) {
	var m = Math.floor((linesize - text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').length) / 2);
	var r = '';
	while (r.length < m) {
		r += ' ';
	}
	return r + text;
};
const line1 = function (dodim) {
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
};
const line2 = function () {
	let p = Math.floor((linesize - 3 - 3 - 3) / 2);
	let fill = '';
	while (p > 0) {
		fill += '-';
		p--;
	}
	console.log('   ' + (fill + '===' + fill).dim + '   ');
};
const line3 = function (text) {
	let p = Math.floor((linesize - 3 - 3 - text.length) / 2);
	let fill = '';
	while (p > 0) {
		fill += '-';
		p--;
	}
	console.log('   ' + (fill + text + fill).dim + '   ');
};

exports.center = center;
exports.line1 = line1;
exports.line2 = line2;
exports.line3 = line3;