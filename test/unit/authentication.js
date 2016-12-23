import * as server from '../support/request';
import * as assert from 'assert';

describe('REST APP Authentication', function () {
	let id;
	it("Can't get a private model", function (done) {
		server.expect(401);
		server.get('pages').then(body => {
			assert.equal('Unauthorized', body);
			done(null, body);
		}, done).catch(done);
	});

	let bearerToken;
	it('Creates a secured user', function (done) {
		server.expect(201);
		server.post('singup', {
			name: 'agent007',
			username: 'agent',
			password: '007'
		}).then(body => {
			server.get('users').then(json => {
				id = json.users[1].id;
				done(null, json);
			}, done).catch(done);
		});
	});
	it('Session Login', function (done) {
		server.fullResponse();
		server.post('singin/?username=agent&password=007').then(response => {
			done(null, response);
		});
	});
	it('Can get a private model', function (done) {
		server.get('pages').then(body => {
			assert.ok(body.pages);
			done(null, body);
		}, done).catch(done);
	});

	it('Can\'t get an access token (uncomplete args)', function (done) {
		server.expect(406);
		server.post('token/?username=agent&password=007&response_type=code', {
			grant_type: 'password'
		}).then(done.bind(null, null), done).catch(done);
	});

	it('Get an access token', function (done) {
		server.post('token/?username=agent&password=007&response_type=code&client_id=123456', {
			username: 'agent',
			passowrd: '007',
			grant_type: 'password'
		}).then(body => {
			bearerToken = `${body.token_type} ${body.access_token}`;
			assert.ok(bearerToken);
			done(null, null);
		}, done).catch(done);
	});
	it('logout', function (done) {
		server.post('singout').then(res => {
			server.expect(401);
			server.get('pages').then(done.bind(null, null), done).catch(done);
		}, done).catch(done);
	});
	it('Makes a request with the access token', function (done) {
		global.id = id;
		global.headers = {Authorization: bearerToken};
		server.headers(global.headers).get('pages').then(body => {
			done(null, null);
		}, done).catch(done);
	});
});
