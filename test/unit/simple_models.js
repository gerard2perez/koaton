import * as server from '../support/request';
import * as assert from 'assert';

describe('CRUD REST API Simple Models', function () {
	let id,
		id2;
	it('Checks for the available verbs', function (done) {
		server.expect(204);
		server.options('users').then(json => {
			done(null, json);
		});
	});

	it('Reads the seeded users', function (done) {
		server.get('users').then(json => {
			id = json.users[0].id;
			assert.ok(id);
			done(null, json);
		});
	});

	it('Creates a User', function (done) {
		server.post('users', {
			user: {
				name: 'Code',
				password: '123456',
				lastname: 'Breaker',
				age: 26,
				email: 'code@breaker.26'
			}
		}).then(json => {
			assert.equal(json.user.name, 'Code');
			id2 = json.user.id;
			done(null, json);
		}, done).catch(done);
	});

	it('Reads a user by id', function (done) {
		server.get('users', id).then(json => {
			assert.equal(json.user.name, 'gerardo');
			done(null, json);
		}, done).catch(done);
	});

	it('Updates an user value', function (done) {
		server.put('users', id2, {
			user: {
				email: 'code@breaker.com',
				extrafield: 'this value can`t be added'
			}
		}).then(json => {
			assert.equal(json.user.name, 'Code');
			assert.equal(json.user.email, 'code@breaker.com');
			server.expect(304);
			return server.get('users', json.user.id).then(done.bind(null, null), done).catch(done);
		}, done).catch(done);
	});

	it('Deletes an user', function (done) {
		server.delete('users', id2).then(done.bind(null, null)).catch(done);
	});

	it('Check the only existing user is the seeded one', function (done) {
		server.get('users').then(json => {
			assert.equal(json.users.length, 1);
			assert.equal(json.users[0].id, id);
			done(null, json);
		}, done).catch(done);
	});
});
