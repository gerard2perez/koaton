# First release is comming soon ... :D
![Koaton](/templates/public/img/koaton2.png)
-----------
[![Build Status](https://img.shields.io/travis/gerard2p/koaton.svg?style=flat-square&branch=master)](https://travis-ci.org/gerard2p/koaton)[![Dependency Status](https://david-dm.org/gerard2p/koaton.svg?style=flat-square)](https://david-dm.org/gerard2p/koaton)[![Code Climate](https://codeclimate.com/github/gerard2p/koaton/badges/gpa.svg)](https://codeclimate.com/github/gerard2p/koaton)

Koaton is a CLI tool that provides a nice starting point for full stack JavaScript Web development with [Koa](http://koajs.com/), [Ember](http://emberjs.com/), and [Node.js](http://www.nodejs.org/) along with [CaminateJS](http://www.camintejs.com/) and [WebSockets](https://developer.mozilla.org/en/docs/WebSockets).

# Important
I will probably split this project in at least two repos, one for the CLI and another for the server itself, website plan are still up, I will also like to integrate Istanbul  or another test engine like that in order to add Test Coverage.
I will also like to integrate babel to the flow so the project is ES6/Koa2 compatible and it make it easy to adopt ESNext features.

Soon I will release the first public version of Koaton, and soon I will release a Koa2 compatible version along with the repo split.

This version has a lot of features like:

CRUD Router,
Custom Router,
Bearer Authentication,
Local Authentication,
CRUD Models (ember-cli-crudatable)
Koaton_Modules (an easy way to import/export routes/controller/views ) (this can be seen as a way to combine multiple server in one)

Way to much things


```
version: 0.2.8-alpha.4
Command list:
  koaton adapter <driver> [options]
	Install the especified driver adapter.
	-l --list         Show the adapters installed in the current application. koaton adapter -l
	-u --uninstall    Removes the driver
	-g --generate     Creates an adapter template for the especified driver
	--host               <hostname> Default is localhost. Use this with -g
	--port               <port> Default driver port. Use this with -g
	--user               <username> User to connect to database default is ''. Use this with -g
	--db               <databse> Database name for the connection default is ''. Use this with -g
	--password               <databse> Password to login in your database default is ''. Use this with -g


  koaton barebone <koaton_app> <ember_app> <ember_app_mount>
	Run the needed commands to


  koaton build <config_file> [options]
	Make bundles of your .js .scss .css files and output to public folder.
	Default value is ./config/bundles.js
	-p --prod         builds for production
	--port               <port> port to build


  koaton ember <app_name> [options]
	If no app_name epecified it lists all the installed ember apps.
	-p ---prod        Build for production environment
	-n --new          Creates a new ember app with the especified named.
	-f --force        Overrides the current app.
	-u --use         <ember_addon> Install the especified addon in the especified app.
	-m --mount       <path> (Default: /) Sets the mounting path in the koaton app. Can be used with -n or alone.
	-b --build       <env> [ development | production] Builds the especified ember app in the Koaton app.
	-s --subdomain   <subdomain> (Default: www) Sets the subdomain to mount the application.
	--port               <port> port to build


  koaton forever  [options]
	Runs your awsome Koaton on production mode with forever.
	-l --list         Lists all Koaton running applicactions.
	-o --logs        <app> Shows the logs for the selected app.
	-s --stop         Stops all the forever running servers.
	--port               <port> (Default: 62626) Run on the especified port (port 80 requires sudo).


  koaton install
	SetUps a recent clonned proyect. (root/Administrator permission needed to work with nginx)


  koaton model <name> <fields|linkaction> <[destmodel]> <as> <[relation_property]> <[foreign_key]> [options]
	Creates a new model. fields must be sourrounded by "".
	  Fields syntax:
			  field_name:type [ number | integer | float | double | real | boolean | string | text | json | date | email | password | blob ]
	  example:
			  koaton model User "active:integer name email password note:text created:date"
			  koaton model User hasmany Phone phones phoneId

	-e --ember       <app> Generates the model also for the app especified.
	-f --force        Deletes the model if exists.
	-r --rest         Makes the model REST enabled.


  koaton modulify
	Run the needed commands to


  koaton new <app_name> [options]
	Creates a new koaton aplication.
	-d --db          <driver> [ mongoose | mongo | mysql | mariadb | postgres | redis | sqlite3 | couchdb | couch | neo4j | riak | firebird | tingodb | rethinkdb |  ]
	-e --view-engine <engine> [ ejs | handlebars |  ]
	-f --force        Overrides the existing directory.
	-n --skip-npm     Omits npm install
	-b --skip-bower   Omits bower install


  koaton publish  [options]
	Take the actions needed to commit and publish a new version of your app.
	-t --tag         <tag> [latest | alpha | beta] Optional taganame to publish on npm
	-v --semver      <version> [alpha | alpha_minor | alpha_major | beta | beta_minor | beta_major | major | minor | patch] Select if you want to increse your pakage version
	-m --message     <message> This is the message that would be added to the commit


  koaton seed
	Run the seed of your project.


  koaton semver <mode>
	mode can be major, minor, patch, beta, beta_major, alpha, alpha_major


  koaton serve  [options]
	Runs your awsome Koaton applicaction using nodemon
	-s --skip-build   undefined
	-p --production   Runs with NODE_ENV = production
	--port               <port> Run on the especified port (port 80 requires sudo).

```

Thats is what koaton show if you type "koaton -h" in your console, so if you can't wait until I refactor the code and you have a question open an Issue, and I'll be happy to help you.

  The Latest Version
  ------------------
 [![NPM Version](http://img.shields.io/npm/v/koaton.svg?style=flat-square)](https://www.npmjs.org/package/koaton)

## Documentation

```bash
koaton --help
```
Or

Documentation will be avaliable at:
<http://www.koaton.io/docs/>

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
Read [LICENCE.md](LICENCE.md)
