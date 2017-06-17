import * as path from 'upath';

/** @ignore */
const bundletemplates = {
	'.css': (file) => {
		return `<link rel='stylesheet' href='${file}'>`;
	},
	'.js': (file) => {
		return `<script src='${file}'></script>`;
	}
};

/**
 * Represents a Bundle Item used by the template engines to render .css or .js files.
 * @class BundleItem
 * @param {String} target Identifier that will be use as name of the bundle.
 * @param {String|String[]} source File(s) that will be bundled.
 */
export default class BundleItem {
	/**
 	* @param {String} target - Identifier that will be use as name of the bundle.
 	* @param {String|String[]} source - File(s) that will be bundled.
 	*/
	constructor (target, source) {
		Object.defineProperty(this, 'kind', {
			enumerable: false,
			value: target.replace(path.trimExt(target), '')
		});
		Object.defineProperty(this, 'file', {
			enumerable: true,
			value: target
		});
		Object.defineProperty(this, 'content', {
			writable: true,
			enumerable: false,
			value: source instanceof Array ? source : (source ? [source] : [])
		});
	}
	/**
	 * Adds a new filepath to the bundle.
	 * @param {String} item - File location of the file to add.
	 * @return {BundleItem} - Returns the BundleItem instace for chaining.
	 */
	add (item) {
		if (this.content.indexOf(item) === -1) {
			this.content.push(item);
		}
		return this;
	}
	/**
 * Removes all files added to the bundle.
 * @return {BundleItem} - Returns the BundleItem instace for chaining.
 */
	clear () {
		while (this.content.length > 0) {
			this.content.pop();
		}
		return this;
	}
	/**
	 * Compares two BundleItem and returns true is equal.
	 * @param {BundleItem} target - BundleItem to campare to.
	 * @return {Boolean} - true if they are equal false otherwise.
	 */
	equals (target) {
		return this.file === target.file;
	}
	/**
	 * Transform the BundleItem to a JSON representation.
	 * @return {String[]} - Return the value of the source files.
	 */
	toJSON () {
		return this.content;
	}
	/**
	 * Return the target file name
	 * @return {String}
	 */
	valueOf () {
		return this.file;
	}
	/**
	 * Returns the representation of the bundle in <link rel='stylesheet' href='...'> or <script src='...'></script> format.
	 * @return {String}
	 */
	toString () {
		let res = '';
		for (const idx in this.content) {
			res += bundletemplates[this.kind](this.content[idx]);
		}
		return res;
	}
	/**
	 * Return an iterator that can be use with for ... of
	 * @alias BundleItem.iterator
	 * @return {Symbol.iterator}
	*/
	[ Symbol.iterator] () {
		let index = -1;
		return {
			next: () => ({
				value: this.content[++index],
				done: !(index < this.content.length)
			})
		};
	}
}
