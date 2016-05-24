'use strict';
const datatypes = require("../adapter").datatypes;
const fs = require('graceful-fs');
const path = require('path');
const prompt = require('co-prompt');
let utils;
module.exports = {
	cmd: "model",
	description: `Creates a new model. fields must be sourrounded by \"\".
	${"Fields syntax".yellow}:
		${"field_name"}:${"type".cyan}	${"[ ".yellow+Object.keys(datatypes).map((c)=>{return c.toLowerCase().cyan}).join( " | ".yellow )+" ]".yellow}
	${"example:".yellow}
		koaton model User "active:integer name email password note:text created:date"
`,
	args: ["name", "fields"],
	options: [
		["-e", "--ember <app>", "Generates the model also for the app especified."],
		["-f", "--force", "Deletes the model if exists."],
		["-r", "--rest", "Makes the model REST enabled."]
	],
	action: function*(name, fields, options) {
		const inflector = require('i')();
		const inflections = require(process.cwd() + '/config/inflections');
		utils = require('../utils');
		inflections.irregular.forEach((inflect) => {
			inflector.inflections.irregular(inflect[0], inflect[1]);
		});
		if (name === undefined) {
			console.log("you must especifie a ".red + "name".yellow);
			return 1;
		}
		name = inflector.singularize(name.toLowerCase());
		var definition = {
			model: {},
			extra: {}
		};
		if (fields !== undefined) {
			fields = fields.split(' ').map((field) => {
				return field.split(':');
			});
			fields.forEach((field) => {
				field[1] = inflector.titleize(field[1] || "String");
				definition.model[field[0]] = `{ type:schema.${datatypes[field[1]]} }`;
			});
		}
		definition = JSON.stringify(definition, null, '\t').replace(/"\{/igm, "{").replace(/\}"/igm, "}");
		definition = utils.Compile(yield utils.read(path.join(__dirname,"..","templates","koaton_model"),{encoding:"utf-8"}),{definition:definition});

		var ok = true;
		console.log(`${process.cwd()}/models/${name.toLowerCase()}.js`);
		console.log();
		if (utils.canAccess(`${process.cwd()}/models/${name.toLowerCase()}.js`) && !options.force) {
			ok = yield prompt.confirm(`The model ${name.green} already exits,do you want to override it? [y/n]: `);
		}
		if (!ok) {
			return 0;
		}
		yield utils.write(process.cwd() + "/models/" + name.toLowerCase() + ".js", definition);
		if (options.rest && ok) {
			var restcontroller = `"use strict";\nmodule.exports = {\n\tREST:true\n};`;
			yield utils.write(process.cwd() + "/controllers/" + name.toLowerCase() + ".js", restcontroller);
		}
		if (options.ember) {

			if (!fs.existsSync(path.join(process.cwd(), "/ember/", options.ember))) {
				console.log(`The app ${options.ember} does not exists.`.red);
				return 1;
			}

			definition="";
			fields.forEach((field) => {
				field[1] = inflector.titleize(field[1] || "String");
				definition += `\t${field[0]}:attr('${datatypes[field[1]].ember}'),\n`
			});
			definition = utils.Compile(yield utils.read(path.join(__dirname,"..","templates","ember_model"),{encoding:"utf-8"}),{definition:definition});
			yield utils.write(path.join(process.cwd(), "/ember/", options.ember, "/app/models/", name + ".js"), definition);

			if (options.rest) {
				definition = utils.Compile(yield utils.read(path.join(__dirname,"..","templates","ember_controller"),{encoding:"utf-8"}),
				{model:name,definition:`${fields.map((f)=>{return f[0];}).join(':{},\n\t\t')}:{}`});
				yield utils.write(process.cwd() + "/ember/" + options.ember + "/app/controllers/" + name + ".js", definition);
				yield utils.write(
					process.cwd() + "/ember/" + options.ember + "/app/templates/" + name + ".hbs",
					`{{crud-table\n\tfields=this.fieldDefinition\n}}`
				);
			}
			console.log(`Please add this.route('${name}') to your ember app router.js`);
		}
		return 0;
	}
};
