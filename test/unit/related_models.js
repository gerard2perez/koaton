import * as server from '../support/request';
import * as assert from 'assert';

describe('CRUD REST API Related Models', function () {
	let bookId;
	it('Creates a parent book', function (done) {
		server.headers(global.headers).post('books', {
			book: {
				title: 'three eggs',
				author: 'some dude',
				page_count: 1000,
				pages: [
					{
						number: 1,
						content: 'casa'
					}
				]
			}
		}).then(body => {
			assert.equal(body.book.title, 'three eggs');
			assert.equal(body.book.author, 'some dude');
			assert.equal(body.book.page_count, 1000);
			assert.equal(body.book.pages.length, 1);
			bookId = body.book.id;
			done(null, body);
		}, done).catch(done);
	});
	it('Creates a page append to a book', function (done) {
		server.headers(global.headers).post('books', bookId, 'pages', {
			number: 2,
			content: 'just got inspired'
		}).then(body => {
			assert.equal(body.book.title, 'three eggs');
			assert.equal(body.book.author, 'some dude');
			assert.equal(body.book.page_count, 1000);
			assert.equal(body.book.pages.length, 2);
			done(null, body);
		}, done).catch(done);
	});
	it('Reads the books info', function (done) {
		server.headers(global.headers).get('books').then(body => {
			assert.ok(body.books.length);
			done(null, body);
		}, done).catch(done);
	});
	it('Deletes the secured user', function (done) {
		server.delete('users', global.id).then(done.bind(null, null), done).catch(done);
	});
});
