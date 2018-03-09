import * as assert from 'assert';
import BundleItem from '../../src/support/BundleItem';
import {describe, it} from 'mocha';

/**
 * @test {BundleItem}
 */
describe('BundleItem', () => {
	let Item = new BundleItem('target.css');
	/** @test {BundleItem#constructor} */
	it('Initialize with 0 Items', () => {
		assert.equal(0, Item.content.length);
	});
	/** @test {BundleItem#constructor} */
	it('Initialize with 1 Items', () => {
		Item = new BundleItem('target.css', './assets/flatadmin/css/themes.css');
		assert.equal(1, Item.content.length);
	});
	/** @test {BundleItem#constructor} */
	it('Initialize with two Items', () => {
		Item = new BundleItem('target.css', ['./assets/flatadmin/css/themes.css', './assets/flatadmin/css/style.css']);
		assert.equal(2, Item.content.length);
	});
	/** @test {BundleItem#add} */
	it('Add an Item', () => {
		assert.equal(Item, Item.add('./assets/flatadmin/css/checkbox3.min.css'));
		assert.equal(3, Item.content.length);
	});
	/** @test {BundleItem#add} */
	it('Prevent adding duplicated Item', () => {
		assert.equal(Item, Item.add('./assets/flatadmin/css/checkbox3.min.css'));
		assert.equal(3, Item.content.length);
	});
	/** @test {BundleItem#equals} */
	it('Is equal to another item if name is the same', () => {
		const Item2 = new BundleItem('target.css', ['./assets/flatadmin/css/select2.min.css', './assets/flatadmin/css/animate.min.css']);
		assert.equal(Item.equals(Item2), true);
	});
	/** @test {BundleItem#toJSON} */
	it('JSON representation es the content property', () => {
		assert.equal(JSON.stringify(Item.content), JSON.stringify(Item));
	});
	/** @test {BundleItem#Symbol.iterator} */
	it('Can Iterate through items', () => {
		let index = 0;
		for (const source of Item) {
			index++;
			assert.equal(!source, false);
		}
		assert.equal(3, index);
	});
	/** @test {BundleItem#toString} */
	it('Return html tags when converting to string', () => {
		let JSItem = new BundleItem('target.js', './assets/flatadmin/js/app.js');
		assert.equal(Item.toString(), "<link rel='stylesheet' href='./assets/flatadmin/css/themes.css'><link rel='stylesheet' href='./assets/flatadmin/css/style.css'><link rel='stylesheet' href='./assets/flatadmin/css/checkbox3.min.css'>");
		assert.equal(JSItem.toString(), "<script src='./assets/flatadmin/js/app.js'></script>");
	});
	/** @test {BundleItem#clear} */
	it('Clears Content', () => {
		assert.equal(Item, Item.clear());
		assert.equal(0, Item.content.length);
	});
	/** @test {BundleItem#valueOf} */
	it('Returns target name', () => {
		assert.equal(Item.valueOf(), 'target.css');
	});
});
