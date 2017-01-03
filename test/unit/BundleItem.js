/*global describe, it*/
import * as assert from 'assert';
import BundleItem from '../../src/support/BundleItem';

describe('BundleItem', function () {
	let Item = new BundleItem('target.css');
	it('Initialize with 0 Items', function () {
		assert.equal(0, Item.content.length);
	});
	it('Initialize with 1 Items', function () {
		Item = new BundleItem('target.css', 'origin_a.css');
		assert.equal(1, Item.content.length);
	});
	it('Initialize with two Items', function () {
		Item = new BundleItem('target.css', ['origin_a.css', 'origin_b.css']);
		assert.equal(2, Item.content.length);
	});

	it('Add an Item', function () {
		assert.equal(Item, Item.add('origin_c.css'));
		assert.equal(3, Item.content.length);
	});

	it('Prevent adding duplicated Item', function () {
		assert.equal(Item, Item.add('origin_c.css'));
		assert.equal(3, Item.content.length);
	});

	it('Is equal to another item if name is the same', function () {
		const Item2 = new BundleItem('target.css', ['origin_y.css', 'origin_z.css']);
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
		let JSItem = new BundleItem('target.js', 'origin_a.js');
		assert.equal(Item.toString(), "<link rel='stylesheet' href='origin_a.css'><link rel='stylesheet' href='origin_b.css'><link rel='stylesheet' href='origin_c.css'>");
		assert.equal(JSItem.toString(), "<script src='origin_a.js'></script>");
	});
	it('Clears Content', function () {
		assert.equal(Item, Item.clear());
		assert.equal(0, Item.content.length);
	});
	it('Returns target name', function () {
		assert.equal(Item.valueOf(), 'target.css');
	});
});
