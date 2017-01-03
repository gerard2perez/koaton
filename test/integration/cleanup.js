import * as server from '../support/request';
import * as assert from 'assert';

describe('Leave Things Clean', function () {
	it('Deletes the secured user', function (done) {
		server.delete('users', global.id).then(done.bind(null, null), done).catch(done);
	});
	it('Waits for token to expire', function (done) {
		let [seconds, nanoseconds] = process.hrtime(global.bearerTokenTime);
		let wait = 3000 - (seconds * 1000 + Math.ceil(nanoseconds / 1e6));
		setTimeout(function () {
			server.expect(401);
			server.headers(global.headers).get('pages').then(body => {
				assert.equal('Unauthorized', body);
				done(null, body);
			}, done).catch(done);
		}, wait);
	});
});
