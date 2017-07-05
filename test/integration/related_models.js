import * as server from '../support/request';
import * as assert from 'assert';
function random (min, max) {
	return Math.random() * (max - min) + min;
}
const rdn = random.bind(null, 1, 500);

describe('CRUD REST API Related Models', function () {
	let bookId;
	let distributor;
	let pages;
	it('Creates a parent book', function (done) {
		server.expect(201);
		server.headers(global.headers).post('books', {
			book: {
				title: 'three eggs',
				author: 'some dude',
				page_count: 10,
				pages: [
					{
						number: 1,
						content: 'casa'
					}
				],
				distributor: {
					name: 'Big Cheif'
				}
			}
		}).then(body => {
			assert.equal(body.book.sucursals.length, 0);
			assert.equal(body.book.title, 'three eggs');
			assert.equal(body.book.author, 'some dude');
			assert.equal(body.book.page_count, 10);
			assert.equal(body.book.pages.length, 1);
			assert.equal(typeof body.book.distributor, 'string');
			distributor = body.book.distributor;
			pages = body.book.pages;
			done(null, true);
		}, done).catch(done);
	});

	it('Creates a book with id pages', function (done) {
		server.expect(201);
		server.headers(global.headers).post('books', {
			book: {
				title: 'three eggs',
				author: 'some dude2',
				page_count: 20,
				pages: pages
			}
		}).then(body => {
			assert.equal(body.book.title, 'three eggs');
			assert.equal(body.book.author, 'some dude2');
			assert.equal(body.book.page_count, 20);
			assert.equal(body.book.pages.length, 1);
			assert.equal(body.book.distributor, undefined);
			bookId = body.book.id;
			done(null, true);
		}, done).catch(done);
	});
	it('Append a distributor to a book', function (done) {
		server.headers(global.headers).post('books', bookId, 'distributor', {
			distributor: distributor
		}).then(body => {
			assert.equal(body.book.title, 'three eggs');
			assert.equal(body.book.author, 'some dude2');
			assert.equal(body.book.page_count, 20);
			assert.equal(body.book.pages.length, 1);
			assert.equal(body.book.distributor, distributor);
			done(null, true);
		}, done).catch(done);
	});
	it('Finds books by a given distributor', function (done) {
		server.headers(global.headers).get(`books?distributor.id=${distributor}`).then(json => {
			assert.equal(json.books.length, 1);
			done(null, json);
		});
	});
	it('Creates a sucursals append a book', function (done) {
		server.expect(201);
		server.headers(global.headers).post('sucursals', {
			sucursal: {
				name: 'Sucursal 1',
				books: [bookId]
			}
		}).then(body => {
			assert.equal(body.sucursal.books.length, 1);
			assert.equal(body.sucursal.name, 'Sucursal 1');
			done(null, true);
		}, done).catch(done);
	});

	it('Creates a book with no pages', function (done) {
		server.expect(201);
		server.headers(global.headers).post('books', {
			book: {
				title: 'three eggs 2',
				author: 'same dude',
				page_count: 0,
				distributor: distributor
			}
		}).then(body => {
			assert.equal(body.book.title, 'three eggs 2');
			assert.equal(body.book.author, 'same dude');
			assert.equal(body.book.page_count, 0);
			assert.equal(body.book.pages, undefined);
			assert.equal(typeof body.book.distributor, 'string');
			bookId = body.book.id;
			done(null, true);
		}, done).catch(done);
	});

	it('Get content with relation mode set to objects', function (done) {
		Object.defineProperty(configuration.server.database, 'relationsMode', {value: 'objects'});
		server.headers(global.headers).get('books').then(body => {
			assert.equal(typeof body.books[1].pages[0], 'object');
			assert.equal(body.books[1].sucursals.length, 1);
			assert.equal(body.books[0].sucursals.length, 0);
			assert.equal(typeof body.books[1].distributor, 'object');
			done(null, true);
		}, done).catch(done);
	});
	it('Creates a page append to a book', function (done) {
		Object.defineProperty(configuration.server.database, 'relationsMode', {value: 'ids'});
		server.headers(global.headers).post('books', bookId, 'pages', {
			number: 2,
			content: 'just got inspired'
		}).then(body => {
			assert.equal(body.book.title, 'three eggs 2');
			assert.equal(body.book.author, 'same dude');
			assert.equal(body.book.page_count, 0);
			assert.equal(body.book.pages.length, 1);
			assert.equal(body.book.sucursals.length, 0);
			done(null, true);
		}, done).catch(done);
	});
	it('Fails to append a page a book', function (done) {
		server.expect(402);
		server.headers(global.headers).post('books', bookId, 'page', {
			number: 2,
			content: 'just got inspired'
		}).then(done.bind(null, null), done).catch(done);
	});
	it('Reads the books info', function (done) {
		server.headers(global.headers).get('books').then(body => {
			assert.ok(body.books.length);
			done(null, true);
		}, done).catch(done);
	});
	it('Populates the databases with a 100 pages', function (done) {
		let pages = [];
		for (let i = 1; i <= 100; i++) {
			pages.push({ number: rdn(), content: 'content' + rdn() });
		}
		server.expect(201);
		server.headers(global.headers).post('pages', {
			pages: pages
		}).then(body => {
			assert.ok(body.pages.length);
			assert.ok(body.pages[99].number);
			done(null, true);
		}, done).catch(done);
	});
	it('Populates the databases with 100 books', function (done) {
		let books = [];
		let i;
		for (i = 1; i <= 90; i++) {
			books.push({
				title: 'title' + rdn(),
				author: 'author' + rdn(),
				page_count: rdn(),
				pages: [
					{ number: rdn(), content: 'content' + rdn() },
					{ number: rdn(), content: 'content' + rdn() }
				],
				distributor: distributor
			});
		}
		for (i; i <= 95; i++) {
			books.push({
				title: 'title' + rdn(),
				author: 'author' + rdn(),
				page_count: random(600, 700),
				pages: [
					{ number: rdn(), content: 'content' + rdn() },
					{ number: rdn(), content: 'content' + rdn() }
				],
				distributor: distributor
			});
		}
		for (i; i <= 100; i++) {
			books.push({
				title: 'title' + rdn(),
				author: 'author' + rdn(),
				page_count: random(800, 900),
				pages: [
					{ number: rdn(), content: 'content' + rdn() },
					{ number: rdn(), content: 'content' + rdn() }
				],
				distributor: distributor
			});
		}
		server.expect(201);
		server.headers(global.headers).post('books', {
			books: books
		}).then(body => {
			assert.ok(body.books);
			done(null, true);
		}, done).catch(done);
	});
});
