"use strict";
var config = require('./config/server');
var Koa = require('koa');
var chalk = require('chalk');
const join = require('path').join;
var logger = require('koa-logger');
const IO = require( 'koa-socket' );
const io = new IO();

const locale = require('koa-locale');
const i18n = require('koa-i18n');
var app = new Koa();
app.use(logger());
locale(app);

app.use(i18n(app, {
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

app.inflect = require('i')();
app.inflect.inflections.irregular('human', 'humans');

app.use(require('koa-helmet')());
app.use(require('koa-bodyparser')(config.bodyparser));
app.use(require('koa-static')(config.static.directory, config.static));
//app.use(require('koa-etag')());
app.use(require('koa-generic-session')(config.session));
app.use(require('koa-views')(__dirname + '../views', config.view));



require('./config/database')(app, config.database);
//Loads the Routes
app.use(require('./config/routes')(app));


/*const error = require('koa-error');
app.use(error({
  template: join(__dirname, 'views/error.html')
}));*/

//============================================
io.attach( app )
io.on( 'join', ( ctx, data ) => {
  console.log( 'join event fired', data )
});
//============================================

if (!module.parent) {
    app.listen(config.port, function () {
        console.log(
            'Koaton listening on ' + chalk.dim(config.port)
        );
    });
} else {
    module.exports = app
}