![Koaton](/koaton.png)
-----------
[![Build Status](https://img.shields.io/travis/gerard2p/koaton/master.svg?style=flat-square)](https://travis-ci.org/gerard2p/koaton)[![Dependency Status](https://david-dm.org/gerard2p/koaton.svg?style=flat-square)](https://david-dm.org/gerard2p/koaton)![PRs Welcome](https://img.shields.io/badge/PRs%20🔀-Welcome-brightgreen.svg?style=flat-square)

[![Code Climate](https://codeclimate.com/github/gerard2p/koaton/badges/gpa.svg?style=flat-square)](https://codeclimate.com/github/gerard2p/koaton?style=flat-square) [![Test Coverage](https://codeclimate.com/github/gerard2p/koaton/badges/coverage.svg?style=flat-square)](https://codeclimate.com/github/gerard2p/koaton/coverage) [![Issue Count](https://codeclimate.com/github/gerard2p/koaton/badges/issue_count.svg?style=flat-square)](https://codeclimate.com/github/gerard2p/koaton)


![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)[![js-happiness-style](https://img.shields.io/badge/code%20style-happiness-brightgreen.svg?style=flat-square)](https://github.com/JedWatson/happiness)

Koaton is a FullStack Javascript Web Framework. That Allows you to easily create your web application.

Features
------------------
1. World Class [Router](/src/router.js). Inspired by [ASP.NET](https://www.asp.net/), [Laravel](https://laravel.com/).
1. MongoDB support via [CaminteJS](http://www.camintejs.com/).
1. Multiple Subdomains.
1. Web Applications via [Ember](http://emberjs.com/).
1. Support [Handlebars](http://handlebarsjs.com/), [Nunjucks](https://mozilla.github.io/nunjucks/), [EJS](http://www.embeddedjs.com/) via [consolidate](https://github.com/tj/consolidate.js/).
1. Built in Inflector thanks to [inflection](https://github.com/dreamerslab/node.inflection).
1. Model to REST urls. (GET, GET/single, POST, POST/single, PUT, DELETE).
1. Relations: One-To-One, One-To-Many. (Works with POST/PUT).
1. Secure Urls featuring [Passport](http://passportjs.org/).
1. Built in Authorization Server thanks to [oauth2orize-koa](https://github.com/rkusa/koa-passport).
1. Bundles (Pack your CSS and JS file into one).

Koaton is a CLI tool that provides a nice starting point for full stack JavaScript Web development with [Koa](http://koajs.com/), [Ember](http://emberjs.com/), and [Node.js](http://www.nodejs.org/) along with [CaminateJS](http://www.camintejs.com/) and [WebSockets](https://developer.mozilla.org/en/docs/WebSockets).

  The Latest Version
  ------------------
 [![NPM Version](http://img.shields.io/npm/v/koaton.svg?style=flat-square)](https://www.npmjs.org/package/koaton)

## Documentation

Documentation will be avaliable at: <http://www.koaton.io/docs/>

## Installation
```sh
npm i koaton
```
Other programs you may need:
```sh
npm i forever -g
npm i ember-cli -g
```

## Usage
Koaton actually has a [CLI tool](https://github.com/gerard2p/koaton-cli) to please go to that repo and you will find how to use the hole sistem.

## Future Plans
1. Add Full Support for localization.
1. Build my own ORM to extend database support. Currently only MongoDB support all the features of Koaton, but you could use any of the CaminteJS database support for the most basic operations. (FilterSets only supported by MongoDB).
1. Koaton Editor based on [Atom.io](https://atom.io/)
### Some other things
1. I have written all the repo in ES6, ESNEXT but it is transpiled to ES5 so i can be run with [Node 6+](https://nodejs.org/).
1. I'm doing all the posible so the project can be run without the need of Koaton-CLI (so you don't have to install it in your server), but koaton-cli is the official way to developt a Koaton project.



## Contributors

1. Gerardo Pérez Pérez <gerard2perez@outlook.com>


## Licensing
Read [LICENSE](LICENSE)
