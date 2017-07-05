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
			assert.equal(body.meta.page, 1);
			assert.equal(body.meta.page_size, 50);
			assert.equal(body.books.length, 0);
			assert.equal(body.meta.total, 0);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (1)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'page_count', condition: '>', value: 510}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.equal(body.meta.total, 10);
			done(null, true);
		}, done).catch(done);
	});
	it('Finds a sucursal by exact name', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'name', condition: '===', value: 'Sucursal 1'}
				]
			}
		]);
		server.headers(global.headers).get(`sucursals?filterset=${encoded}`).then(body => {
			assert.equal(body.sucursals[0].name, 'Sucursal 1');
			done(null, true);
		}, done).catch(done);
	});
	it('Finds a sucursal by exact book title', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'distributor.name', condition: '===', value: 'Big Cheif'}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.ok(body.books.length > 0);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (2)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'page_count', condition: '>', value: 750, link: 'and'},
					{key: 'page_count', condition: '<', value: 1000, link: 'and'}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.equal(body.meta.total, 5);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (3)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'author', condition: 'like', value: 'dude'}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.equal(body.books[0].title, 'three eggs');
			assert.equal(body.books[1].author, 'some dude2');
			assert.equal(body.books[2].page_count, 0);
			assert.equal(body.meta.total, 3);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (4)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'author', condition: 'in', value: ['some dude', 'some dude2']}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.equal(body.books[0].title, 'three eggs');
			assert.equal(body.books[1].title, 'three eggs');
			assert.equal(body.meta.total, 2);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (5)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'author', condition: 'in', value: ['some dude', 'some dude2']}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}&distributor.name=Big%20Cheif`).then(body => {
			assert.equal(body.books[0].title, 'three eggs');
			assert.equal(body.meta.total, 1);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (6)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'author', condition: 'in', value: ['some dude', 'some dude2'], link: 'or'},
					{key: 'title', condition: '==', value: 'three eggs 2'}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.equal(body.books[0].title, 'three eggs');
			assert.equal(body.meta.total, 3);
			done(null, true);
		}, done).catch(done);
	});
	it('Makes use of my powerfull filtersets (7)', function (done) {
		let encoded = JSURL.stringify([
			{
				filters: [
					{key: 'author', condition: 'in', value: ['some dude', 'some dude2']}
				],
				link: 'or'
			},
			{
				filters: [
					{key: 'title', condition: '==', value: 'three eggs 2'}
				]
			}
		]);
		server.headers(global.headers).get(`books?filterset=${encoded}`).then(body => {
			assert.equal(body.books[0].title, 'three eggs');
			assert.equal(body.meta.total, 3);
			done(null, true);
		}, done).catch(done);
	});
	// it('Makes use of my powerfull filtersets (8)', function (done) {
	// 	server.headers(global.headers).get('books?pages.content=casa').then(body => {
	// 		// assert.equal(body.books[0].pages, 'three eggs');
	// 		assert.equal(body.meta.total, 1);
	// 		done(null, true);
	// 	}, done).catch(done);
	// });
});
