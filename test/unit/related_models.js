import * as server from '../support/request';
import * as assert from 'assert';

describe('CRUD REST API Related Models', function () {
	it('Creates a parent Model', function (done) {
		console.log(global.headers);
		server.headers(global.headers).post('books', {
			book: {
				title: 'three eggs',
				author: 'some dude',
				page_count: 1000
			}
		}).then(body => {
			console.log(body);
			done(null, body);
		}, done).catch(done);
	});
	it('Deletes the secured user', function (done) {
		server.delete('users', global.id).then(done.bind(null, null), done).catch(done);
	});
});
