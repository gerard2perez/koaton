/*global describe, it, before, after, beforeEach*/

'use strict';

const assert = require('assert');
const request = require('request-promise');
const path = require('path');

function localhost (done, ...args) {
	args.splice(0, 0, '/');
	return request(`http://localhost:62650` + path.join(...args)).catch(e => {
		done(e);
	});
}
let verbs = ['get', 'post', 'put', 'delete', 'options'];

function _rest (...args) {
	let [method, ...rest] = args;
	let payload = rest.splice(rest.length - 1, 1)[0];
	let body = '';
	rest.splice(0, 0, '/');
	if (typeof payload === 'object') {
		body = JSON.stringify(payload);
	} else {
		rest.splice(rest.length, 0, payload);
	}

	return request({
		headers: {
			'content-type': 'application/json'
		},
		body: body,
		method: method.toUpperCase(),
		url: `http://localhost:62650` + path.join(...rest)
	}).then(json => JSON.parse(json || '{}'));
}
let rest = {};
for (const verb of verbs) {
	rest[verb] = _rest.bind(null, verb);
}

let server;
process.chdir('testingapp');
process.env.port = 62650;
process.env.NODE_ENV = 'development';
let koaton = require('../../src');

koaton.use(koaton.detectsubdomain);
koaton.use(koaton.conditional);
koaton.use(require(path.resolve('node_modules/koa-bodyparser'))({}));

koaton.use(koaton.passport.initialize());
koaton.use(koaton.passport.session());
koaton.use(koaton.oAuth2Server);
koaton.use(koaton.views);
koaton.use(koaton.subdomainrouter);
server = koaton.start(process.env.port);
describe('Server', function () {
	beforeEach(function () {
		this.timeout(1000 * 60 * 1);
	});
	after(function () {
		server.close();
		process.chdir('..');
	});
	it('gets a html response', function (done) {
		localhost(done).then(html => {
			done(null, html);
		});
	});
	it('gets a compiled handlebars response', function (done) {
		localhost(done, '/panel').then(html => {
			done(null, html);
		});
	});
	describe('REST API', function () {
		let id,
			id2;
		it('Checks for the available verbs', function (done) {
			rest.options('users').then(json => {
				console.log(json);
				done(null, json);
			});
		});
		it('gets the seeded users', function (done) {
			rest.get('users').then(json => {
				id = json.users[0].id;
				assert.ok(id);
				done(null, json);
			});
		});
		it('gets a user by id', function (done) {
			rest.get('users', id).then(json => {
				assert.equal(json.user.name, 'gerardo');
				done(null, json);
			}, done).catch(done);
		});
		it('add a user', function (done) {
			rest.post('users', {
				user: {
					name: 'Code',
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
		it('Updates an user value', function (done) {
			rest.put('users', id2, {
				user: {
					email: 'code@breaker.com',
					extrafield: 'this value can`t be added'
				}
			}).then(json => {
				assert.equal(json.user.name, 'Code');
				assert.equal(json.user.email, 'code@breaker.com');
				rest.get('users', json.user.id).then(response => {
					assert.equal(response.user.name, 'Code');
					assert.equal(response.user.email, 'code@breaker.com');
					assert.equal(response.user.extrafield, undefined);
					done(null, json);
				}, done).catch(done);
			}, done).catch(done);
		});

		it('Deletes an user', function (done) {
			rest.delete('users', id2).then(done.bind(null, null)).catch(done);
		});

		it('Check the only existing user is the seeded one', function (done) {
			rest.get('users').then(json => {
				assert.equal(json.users.length, 1);
				assert.equal(json.users[0].id, id);
				done(null, json);
			}, done).catch(done);
		});

		it('Can\'t get a private model', function (done) {
			rest.get('pages').then(json => {
				assert.equal(json.users.length, 1);
				assert.equal(json.users[0].id, id);
				done(null, json);
			}, done).catch(done);
		});
	});
});
