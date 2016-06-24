'use strict';
const datatypes = require("../adapter").datatypes;
const fs = require('graceful-fs');
const path = require('path');
const prompt = require('co-prompt');
let inflector = null;
let inflections = null;
let utils = null;
const linkactions = {
	no: 0,
	hasMany: 1,
	belongsTo: 2
};
const makerelation = function*(SourceModel, LinkAction, DestModel, relation_property, foreign_key) {
	let destfile = path.join("models", SourceModel + ".js");
	if (utils.canAccess(destfile)) {
		let content = yield utils.read(destfile, {
			encoding: "utf-8"
		});
		const expresion = /"relations.*{([^}]*)/igm;
		const find = expresion.exec(content);
		let text = "";
		if (LinkAction === linkactions.belongsTo) {
			text = `"${relation_property}":relation.belongsTo("${DestModel}.${foreign_key}")`;
		} else {
			text = `"${relation_property}":relation.hasMany("${DestModel}.${foreign_key}")`;
		}
		let comma = find[1].length > 0 ? "," : "";
		let line = find[1].length === 0 ? "\n\t" : "";
		if (content.indexOf(`"${relation_property}"`) === -1) {
			content = content.replace(expresion, `"relations":{${line}$1\t${comma}${text}\n\t`)
			yield utils.write(destfile, content,true);
		}
		return 0;
	}
	return 1;
}
const makemodel = function*(name, fields, options) {
	var definition = {
		model: {},
		extra: {},
		relations:{}
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
	definition = utils.Compile(yield utils.read(path.join(__dirname, "..", "templates", "koaton_model"), {
		encoding: "utf-8"
	}), {
		definition: definition
	});

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
		definition = "";
		fields.forEach((field) => {
			field[1] = inflector.titleize(field[1] || "String");
			definition += `\t${inflector.underscore(field[0])}:attr('${datatypes[field[1]].ember}'),\n`
		});
		definition = utils.Compile(yield utils.read(path.join(__dirname, "..", "templates", "ember_model"), {
			encoding: "utf-8"
		}), {
			definition: definition
		});
		yield utils.write(path.join(process.cwd(), "/ember/", options.ember, "/app/models/", name + ".js"), definition);

		if (options.rest) {
			definition = utils.Compile(yield utils.read(path.join(__dirname, "..", "templates", "ember_controller"), {
				encoding: "utf-8"
			}), {
				model: name,
				definition: `${fields.map((f)=>{return f[0];}).join(':{},\n\t\t')}:{}`
			});
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
module.exports = {
	cmd: "model",
	description: `Creates a new model. fields must be sourrounded by \"\".
	${"Fields syntax".yellow}:
		${"field_name"}:${"type".cyan}	${"[ ".yellow+Object.keys(datatypes).map((c)=>{return c.toLowerCase().cyan}).join( " | ".yellow )+" ]".yellow}
	${"example:".yellow}
		koaton model User "active:integer name email password note:text created:date"
`,
	args: ["name", "fields|linkaction", "[destmodel]", "[relation_property]", "[foreign_key]"],
	options: [
		["-e", "--ember <app>", "Generates the model also for the app especified."],
		["-f", "--force", "Deletes the model if exists."],
		["-r", "--rest", "Makes the model REST enabled."]
	],
	action: function*(name, fields, destmodel, relation_property, foreign_key, options) {
		inflector = require('i')();
		inflections = require(process.cwd() + '/config/inflections');
		let linkaction = null;
		if (destmodel) {
			linkaction = linkactions[fields]
			destmodel = inflector.singularize(destmodel.toLowerCase());
		}
		utils = require('../utils');
		inflections.irregular.forEach((inflect) => {
			inflector.inflections.irregular(inflect[0], inflect[1]);
		});
		if (name === undefined) {
			console.log("you must especifie a ".red + "name".yellow);
			return 1;
		}
		name = inflector.singularize(name.toLowerCase());
		if (linkaction === null) {
			return yield makemodel(name, fields, options);
		} else {
			return yield makerelation(name, linkaction, destmodel, relation_property, foreign_key);
		}
	}
};
