const assert = require('assert');
const $ = require('cheerio');
const path = require('path');
const request = require('request-promise').defaults({
	jar: true
});
let response = {
	expect: 200
};
let lastheaders;
let url;
let etag = {};
let requestHeaders;
let server = {
	url (newUrl) {
		url = newUrl;
		return this;
	},
	headers (newHeaders) {
		requestHeaders = newHeaders;
		return this;
	},
	lastheaders () {
		return lastheaders;
	},
	expect (statusCode) {
		response.expect = statusCode;
	},
	fullResponse () {
		response.fullResponse = true;
	}
};

function headers (headers) {
	return Object.assign({}, requestHeaders, headers, {
		'if-none-match': etag[url]
	});
}
function rest (...args) {
	let [method, ...server] = args;
	let payload = server.splice(server.length - 1, 1)[0];
	let body = '';
	server.splice(0, 0, '/');
	if (typeof payload === 'object') {
		body = JSON.stringify(payload);
	} else {
		server.splice(server.length, 0, payload);
	}
	url = url || 'www.koaton.test';
	url = `http://${url}:62650${path.join(...server)}`;
	return request({
		headers: headers({
			'content-type': 'application/json'
		}),
		body: body,
		resolveWithFullResponse: this.fullResponse,
		method: method.toUpperCase(),
		url: url,
		simple: false,
		transform: autoParse.bind(this)
	});
}
function caputreETag (body, response) {
	requestHeaders = {};
	lastheaders = response.headers;
	etag[url] = response.headers.etag;
	url = '';
	return body;
}
function autoParse (body, response, resolveWithFullResponse) {
	caputreETag(body, response);
	this.fullResponse = false;
	const expect = this.expect;
	this.expect = 200;
	assert.equal(response.statusCode, expect, `Response StatusCode E(${expect}) - A(${response.statusCode})`);
	response.headers = Object.assign({
		'content-type': ''
	}, response.headers);
	if (response.headers['content-type'].indexOf('application/json') > -1) {
		return resolveWithFullResponse ? response : JSON.parse(body);
	} else if (response.headers['content-type'].indexOf('text/html') > -1) {
		return resolveWithFullResponse ? response : $.load(body);
	} else {
		return resolveWithFullResponse ? response : body;
	}
}

const verbs = ['get', 'post', 'put', 'delete', 'options'];

for (const verb of verbs) {
	server[verb] = rest.bind(response, verb);
}
module.exports = server;
