"use strict";
var path = require('path');

var env = process.env.NODE_ENV || 'development';
var port = process.env.PORT || 62626;
var host = 'http://localhost' + (port != 80 ? ':' + port : '');

var DEBUG = env !== 'production'

module.exports = {
    //http://koajs.com/#application
    name: "koaton",
    keys: ['9184f115438655076a7675827bbfa1d98745217f'],
    env: env,
    port: port,
    //https://github.com/koajs/static#options
    static: {
        directory: path.resolve(__dirname, '../public')
    },
    //https://github.com/koajs/body-parser#options
    bodyparser: {},
    //https://github.com/koajs/generic-session#options
    session: {
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 //24 hours
        }
    },
    //https://github.com/rkusa/koa-passport
    auth: {
        //https://github.com/jaredhanson/passport-facebook
        facebook: {
            clientID: 'your-client-id',
            clientSecret: 'your-secret',
            callbackURL: host + '/auth/facebook/callback'
        },
    },
    //https://github.com/koajs/ejs
    view: {
        map: {
            html: 'handlebars'
        }
        //cache: DEBUG ? false : 'memory',
        //locals: require('./view-locals'),
        //filters: require('./view-filters'),
        //layout: 'layouts/main',
    },
    //https://github.com/balderdashy/waterline
    //https://github.com/balderdashy/waterline-docs#supported-adapters
    database: {
        // Setup Adapters
        // Creates named adapters that have been required
        adapters: {
            'default': require('sails-mongo'),
        },
        // Build Connections Config
        // Setup connections using the named adapter configs
        connections: {
            'default': {
                adapter: 'default',
                database: 'waterline'
            }
        },
        defaults: {
            migrate: 'alter'
        }

    },
    //https://github.com/gusnips/koa-error-ejs
    error: {
        view: 'error/error',
        layout: 'layouts/error',
        custom: {
            401: 'error/401',
            403: 'error/403',
            404: 'error/404',
        },
    },
}