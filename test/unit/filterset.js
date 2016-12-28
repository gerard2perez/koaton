import * as server from '../support/request';
import * as assert from 'assert';
import * as JSURL from 'jsurl';

describe('Paginator', function () {
	it('Paginator no options', function (done) {
		server.headers(global.headers).get('pages').then(body => {
			assert.equal(body.meta.page, 1);
			assert.equal(body.meta.page_size, 50);
			assert.equal(body.pages.length, 50);
			assert.equal(body.meta.total, 302);
			done(null, true);
		}, done).catch(done);
	});
	it('Paginator custom size', function (done) {
		server.headers(global.headers).get('pages?size=100').then(body => {
			assert.equal(body.meta.page, 1);
			assert.equal(body.meta.page_size, 100);
			assert.equal(body.pages.length, 100);
			assert.equal(body.meta.total, 302);
			done(null, true);
		}, done).catch(done);
	});
	it('Custom Page', function (done) {
		server.headers(global.headers).get('pages?page=2').then(body => {
			assert.equal(body.meta.page, 2);
			assert.equal(body.meta.page_size, 50);
			assert.equal(body.pages.length, 50);
			assert.equal(body.meta.total, 302);
			done(null, true);
		}, done).catch(done);
	});
	it('Custom Page and Size', function (done) {
		server.headers(global.headers).get('pages?page=4&size=100').then(body => {
			console.log(body.meta);
			assert.equal(body.meta.page, 4);
			assert.equal(body.meta.page_size, 100);
			assert.equal(body.pages.length, 2);
			assert.equal(body.meta.total, 302);
			done(null, true);
		}, done).catch(done);
	});

	it('Custom Query, Page and Size', function (done) {
		server.headers(global.headers).get('books?distributor.name=Big%20Cheif&page=2').then(body => {
			assert.equal(body.meta.page, 2);
			assert.equal(body.meta.page_size, 50);
			assert.equal(body.books.length, 50);
			assert.equal(body.meta.total, 102);
			done(null, true);
		}, done).catch(done);
	});

	it('Custom Query, Page and Size', function (done) {
		server.headers(global.headers).get('books?distributor.name=Big%20Cheif&title=casa').then(body => {
			console.log(body.books.length);
			// assert.equal(body.meta.page, 2);
			// assert.equal(body.meta.page_size, 100);
			// assert.equal(body.pages.length, 2);
			// assert.equal(body.meta.total, 302);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'page_count', condition: '>', value: 300}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			console.log(JSON.stringify(body, 4, 4));
			done(null, true);
		}, done).catch(done);
	});
});
