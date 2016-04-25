"use strict";
var config = require('./config/server');
var koaton = require('koaton');
const colors = require('colors');
const join = require('path').join;
var logger = require('koa-logger');
const io = new(require('koa-socket'))();
const locale = require('koa-locale');
const i18n = require('koa-i18n');
var version = require('./package.json').version;

locale(koaton);
koaton.use(i18n(koaton, {
	directory: './config/locales',
	locales: ['en'],
	modes: [
        'query', //  optional detect querystring - `/?locale=en-US`
        'subdomain', //  optional detect subdomain   - `zh-CN.koajs.com`
        'cookie', //  optional detect cookie      - `Cookie: locale=zh-TW`
        'header', //  optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
        'url', //  optional detect url         - `/en`
        'tld', //  optional detect tld(the last domain) - `koajs.cn`
    ]
}));

koaton.inflect = require('i')();
koaton.inflect.inflections.irregular('human', 'humans');

koaton.use(require('koa-helmet')());
koaton.use(require('koa-bodyparser')(config.bodyparser));
koaton.use(require('koa-static')(config.static.directory, config.static));
// //app.use(require('koa-etag')());
koaton.use(require('koa-generic-session')(config.session));

koaton.use(koaton.views);
koaton.use(koaton.orm);
koaton.use(koaton.router);

//============================================
io.attach(koaton);
io.on('join', (ctx, data) => {
	console.log('join event fired', data)
});
//============================================
koaton.start(config.port);