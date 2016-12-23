import * as server from '../support/request';

describe('Simple Router Responses', function () {
	it('gets a html response', function (done) {
		server.url('koaton.t3st').get('/').then(done.bind(null, null), done).catch(done);
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
});
