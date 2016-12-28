import * as server from '../support/request';

describe('Leave Things Clean', function () {
	it('Deletes the secured user', function (done) {
		server.delete('users', global.id).then(done.bind(null, null), done).catch(done);
	});
});
