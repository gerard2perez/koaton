# First release is comming soon ... :D
![Koaton](/templates/public/img/koaton2.png)
-----------
[![Build Status](https://img.shields.io/travis/gerard2p/koaton.svg?style=flat-square&branch=master)](https://travis-ci.org/gerard2p/koaton)[![Dependency Status](https://david-dm.org/gerard2p/koaton.svg?style=flat-square)](https://david-dm.org/gerard2p/koaton)[![Code Climate](https://codeclimate.com/github/gerard2p/koaton/badges/gpa.svg)](https://codeclimate.com/github/gerard2p/koaton)

Koaton is a CLI tool that provides a nice starting point for full stack JavaScript Web development with [Koa](http://koajs.com/), [Ember](http://emberjs.com/), and [Node.js](http://www.nodejs.org/) along with [CaminateJS](http://www.camintejs.com/) and [WebSockets](https://developer.mozilla.org/en/docs/WebSockets).

  The Latest Version
  ------------------
 [![NPM Version](http://img.shields.io/npm/v/koaton.svg?style=flat-square)](https://www.npmjs.org/package/koaton)

## Documentation

Documentation will be avaliable at: <http://www.koaton.io/docs/>
and

[README](README.md)

or
```bash
koaton --help
```


## Installation

  Will be:
```sh
npm i koaton -g
```
Other programs you may need:
```sh
npm i forever -g
npm i bower -g
npm i ember-cli -g
```

## Usage
```zsh
koaton new myfirstapp
cd myfirstapp
koaton ember restapp -n -m /panel
koaton model user "active:number name email password note:text created:date" -e restapp -r

koaton serve -b
```

## Do it with style
**CSS, LESS and SASS/SCSS**

Every Framework should include an efficient way of working with *css*, well, i'm working to make it as easy as posible at the moment, so, koaton has a way to work with css pre-processors.

```zsh
koaton build
```

This commands reads the file **/config/bundle.js** and outputs the content in **/public/css/**

The bundle.js files is a exports a json object which contains an array of files:

```
	"dest_file":[ARRAY_OF_SOURCES]
```

** *dest_file* ** can be defined as a javascript or css file.
** *ARRAY_OF_SOURCES* ** can contain a glob patter if we're defined a javascript file or any css/less/sass/scss files if we're defining a css file.

### Develop easily
All the files are automatically watched and rebuild if we're running in the **development** environment.
Any file which if defined in the bundle file would be watched as well as any file which is required in the files defined in the bundle.js.

Koaton uses livereload, so, after a source file is changed, Koaton would rebuild the *dest_file* and will notify the browser to reload the file.

### Fast Fast Fast
Debugin a UI can be hard if we don't have the right tools, that's why Koaton makes SourceMaps of all the bundle files (javascript or css).

SourceMaps will be always be built in **development** environment, but **not** in **production** environment (like it should be).

> Rigth now I don't know hot to concat the SourceMaps for css files so instead of building one single file a file for every element in *ARRAY_OF_SOURCES* would e built **ONLY IN DEVELOPMENT ENVIROMENT** *and for LESS/SASS/SCSS/CSS files*, javascript its fine.

## Contributors

1. Gerardo Pérez Pérez <gerard2perez@outllok.com>


## Licensing
Read [LICENSE](LICENSE)
