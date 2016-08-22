"use strict";
require("colors");
Object.defineProperty(String.prototype, 'lnf', {
	get() {
		return this.replace(/(=+)/igm, "$1".grey).replace(/(\-+)/igm, "$1".dim);
	}
});
Object.defineProperty(String.prototype, 'center', {
	get() {
		return retval.center(this);
	}
});
var retval = {
	center(text) {
		var m = Math.floor((this.line1.length - text.length) / 2);
		var r = "";
		while (r.length < m) {
			r += " ";
		}
		return r + text + r;
	},
	line1: "===------------------------------------------------------===".lnf,
	line2: "-------------------------========-------------------------".lnf,
	line3(text) {
		var off = Math.floor(((this.line2.match(/\=/g) || []).length - text.length) / 2);
		while (off--) {
			text = "=" + text + "=";
		}
		return this.line2.replace(/\=+/igm, text).center;
	}
};
module.exports = retval;
