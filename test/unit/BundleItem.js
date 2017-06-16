/*global describe, it*/
import * as assert from 'assert';
import BundleItem from '../../src/support/BundleItem';

/** @test {BundleItem} */
describe('BundleItem', function () {
	let Item = new BundleItem('target.css');
	it('Initialize with 0 Items', function () {
		assert.equal(0, Item.content.length);
	});
	it('Initialize with 1 Items', function () {
		Item = new BundleItem('target.css', './assets/flatadmin/css/themes.css');
		assert.equal(1, Item.content.length);
	});
	it('Initialize with two Items', function () {
		Item = new BundleItem('target.css', ['./assets/flatadmin/css/themes.css', './assets/flatadmin/css/style.css']);
		assert.equal(2, Item.content.length);
	});
	/** @test {BundleItem#add} */
	it('Add an Item', function () {
		assert.equal(Item, Item.add('./assets/flatadmin/css/checkbox3.min.css'));
		assert.equal(3, Item.content.length);
	});
	/** @test {BundleItem#add} */
	it('Prevent adding duplicated Item', function () {
		assert.equal(Item, Item.add('./assets/flatadmin/css/checkbox3.min.css'));
		assert.equal(3, Item.content.length);
	});
	it('Is equal to another item if name is the same', function () {
		const Item2 = new BundleItem('target.css', ['./assets/flatadmin/css/select2.min.css', './assets/flatadmin/css/animate.min.css']);
		assert.equal(Item.equals(Item2), true);
	});
	it('JSON representation es the content property', function () {
		assert.equal(JSON.stringify(Item.content), JSON.stringify(Item));
	});
	it('Can Iterate through items', function () {
		let index = 0;
		for (const source of Item) {
			index++;
			assert.equal(!source, false);
		}
		assert.equal(3, index);
	});
	it('Return html tags when converting to string', function () {
		let JSItem = new BundleItem('target.js', './assets/flatadmin/js/app.js');
		assert.equal(Item.toString(), "<link rel='stylesheet' href='./assets/flatadmin/css/themes.css'><link rel='stylesheet' href='./assets/flatadmin/css/style.css'><link rel='stylesheet' href='./assets/flatadmin/css/checkbox3.min.css'>");
		assert.equal(JSItem.toString(), "<script src='./assets/flatadmin/js/app.js'></script>");
	});
	it('Clears Content', function () {
		assert.equal(Item, Item.clear());
		assert.equal(0, Item.content.length);
	});
	it('Returns target name', function () {
		assert.equal(Item.valueOf(), 'target.css');
	});
});
