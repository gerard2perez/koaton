import * as server from '../support/request';
import * as assert from 'assert';

describe('Simple Router Responses', function () {
	it('get a stream response', function (done) {
		server.url('origin.koaton.test').get('/').on('response', function (response) {
			// assert.ok(false, '');
			assert.equal(response.statusCode, 200);
			assert.equal(response.headers['content-type'], 'application/octet-stream');
		}).on('error', done).then(function () {
			done(null, null);
		});
	});
	it('return a 404', function (done) {
		server.expect(404);
		server.url('koaton.test').get('/findme').then(body => {
			assert.ok(body.html().indexOf('gerard2perez@outlook.com') > -1);
			done();
		});
	});
	it('sends static content', function (done) {
		server.url('koaton.test').post('/download').then(res => {
			assert.ok(res);
			done();
		});
	});
	it('gets a html response', function (done) {
		server.url('koaton.t3st').get('/').then(function (body) {
			done(null, null);
		}, done).catch(done);
	});
	it('gets a html response', function (done) {
		server.url('koaton.test').get('/').then(done.bind(null, null), done).catch(done);
	});
	it('gets a html response', function (done) {
		server.get('/').then(done.bind(null, null), done).catch(done);
	});
	it('Returns a 304 state', function (done) {
		server.expect(304);
		server.get('/').then(done.bind(null, null), done).catch(done);
	});
	it('gets a compiled handlebars response', function (done) {
		server.get('/panel').then(done.bind(null, null), done).catch(done);
	});
	it('gets a compiled ejs response', function (done) {
		server.get('/ejs').then(done.bind(null, null), done).catch(done);
	});
	it('gets a compiled noengine response', function (done) {
		server.expect(500);
		server.get('/noengine').then(done.bind(null, null), done).catch(done);
	});
	it('gets a compiled noengine response', function (done) {
		server.get('/nunjucks').then(function (body) {
			assert.ok(body.html().indexOf('<title>Nunjucks title</title>') > -1);
			assert.ok(body.html().indexOf('Translated') > -1);
			assert.ok(body.html().indexOf('Traducido') > -1);
			done(null, null);
		}, done).catch(done);
	});
	it('gets a compiled noengine response', function (done) {
		server.get('/helpers/njk').then(function (body) {
			assert.ok(body.html().indexOf('a href="/"') > -1, body.html());
			assert.ok(body.html().indexOf('a href="/helpers"') > -1, body.html());
			assert.ok(body.html().indexOf('a href="/helpers/handlebars"') > -1, body.html());
			assert.ok(body.html().indexOf('a class="active"') > -1, body.html());
			assert.ok(body.html().indexOf('Traducido') > -1, body.html());
			done(null, null);
		}, done).catch(done);
	});
	it('gets a compiled noengine response', function (done) {
		server.get('/helpers/handlebars').then(function (body) {
			assert.ok(body.html().indexOf('a href="/"') > -1, body.html());
			assert.ok(body.html().indexOf('a href="/helpers/njk"') > -1, body.html());
			assert.ok(body.html().indexOf('a href="/helpers"') > -1, body.html());
			assert.ok(body.html().indexOf('a class="active"') > -1, body.html());
			assert.ok(body.html().indexOf('Traducido') > -1, body.html());
			done(null, null);
		}, done).catch(done);
	});
	it('gets a compiled response directly inserted in router', function (done) {
		server.get('/helpers').then(function (body) {
			assert.ok(body.html().indexOf('<title>Nunjucks title</title>') > -1);
			assert.ok(body.html().indexOf('Translated') > -1);
			assert.ok(body.html().indexOf('Traducido') > -1);
			done(null, null);
		}, done).catch(done);
	});
	it('translates handlebars page', function (done) {
		server.get('/handlebars').then(function (body) {
			assert.ok(body.html().indexOf('<title>Handlebars Title</title>') > -1);
			assert.ok(body.html().indexOf('Translated') > -1);
			assert.ok(body.html().indexOf('Traducido') > -1);
			done(null, null);
		}, done).catch(done);
	});
});
