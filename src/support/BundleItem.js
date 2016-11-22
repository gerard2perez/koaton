import * as path from 'upath';

const bundletemplates = {
	".css": (file) => {
		return `<link rel="stylesheet" href="${file}">`;
	},
	".js": (file) => {
		return `<script src="${file}"></script>`;
	}
}

export default class BundleItem {
	valueOf() {
		return this.file;
	}
	constructor(target, source) {
		Object.defineProperty(this, 'kind', {
			enumerable: false,
			value: target.replace(path.trimExt(target), "")
		});
		Object.defineProperty(this, 'file', {
			enumerable: true,
			value: target
		});
		Object.defineProperty(this, 'content', {
			writable: true,
			enumerable: false,
			value: source instanceof Array ? source : ( source ? [source]:[] )
		});
	}
	add(item) {
		if (this.content.indexOf(item) === -1) {
			this.content.push(item);
		}
		return this;
	}
	clear() {
		while (this.content.length > 0) {
			this.content.pop();
		}
		return this;
	}
	equals(target) {
		return this.file === target.file;
	}
	toJSON() {
		return this.content;
	}
	toString() {
			let res = "";
			for (const idx in this.content) {
				res += bundletemplates[this.kind](this.content[idx]);
			}
			return res;
		}
		[Symbol.iterator]() {
			let index = -1;
			return {
				next: () => ({
					value: this.content[++index],
					done: !(index < this.content.length)
				})
			};
		}

}
