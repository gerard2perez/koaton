'use strict';
const datatypes = require("../adapter").datatypes;
const fs = require('graceful-fs');
const path = require('path');
// const prompt = require('co-prompt');
let inflector = null;
let inflections = null;
let utils = null;
const emberrel = [
	"",
	"hasMany",
	"belongsTo"
];
const linkactions = {
	no: 0,
	hasmany: 1,
	belongsto: 2
};
/*
const makerelation = function*(SourceModel, LinkAction, DestModel, relation_property, foreign_key, options) {
	Kmetadata.database.relations[`${SourceModel}.${relation_property}`] = `${emberrel[LinkAction]} ${DestModel} ${foreign_key}`;
	let destfile = path.join("models", SourceModel + ".js");
	if (utils.canAccess(destfile)) {
		let content = yield utils.read(destfile, {
			encoding: "utf-8"
		});
		const expresion = /"relations.*{([^}]*)/igm;
		const find = expresion.exec(content);
		let text = "";
		if (LinkAction === linkactions.belongsto) {
			text = `"${relation_property}":relation.belongsTo("${DestModel}.${foreign_key}")`;
		} else {
			text = `"${relation_property}":relation.hasMany("${DestModel}.${foreign_key}")`;
		}
		let comma = find[1].length > 0 ? "," : "";
		let line = find[1].length === 0 ? "\n\t" : "";
		if (content.indexOf(`"${relation_property}"`) === -1) {
			content = content.replace(expresion, `"relations":{${line}$1\t${comma}${text}\n\t`)
			yield utils.write(destfile, content, true);
		}
		if (options.ember) {
			const source = yield utils.read(process.cwd() + "/ember/" + options.ember + "/app/models/" + SourceModel + ".js", {
				encoding: 'utf-8'
			});
			let reg = new RegExp(`${relation_property}.*?,`);
			let replace = `${relation_property}:DS.${emberrel[LinkAction]}("${DestModel}"),`;
			yield utils.write(process.cwd() + "/ember/" + options.ember + "/app/models/" + SourceModel + ".js", source.replace(reg, replace), true);
		}
		return 0;
	}
	return 1;
}
const makeembermodel = function*(definition, fields, name, options) {
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
	let router = yield utils.read(path.join(process.cwd(), "ember", options.ember, "app", "router.js"), {
		encoding: "utf-8"
	});
	if (router.indexOf(`this.route('${name}')`) === -1) {
		router = router.replace(/Router.map\(.*?function\(.*?\).*?{/igm, `Router.map(function() {\n\tthis.route('${name}');\n`);
		yield utils.write(path.join(process.cwd(), "ember", options.ember, "app", "router.js"), router, 1);
		//console.log(router);
		//console.log(`Please add this.route('${name}') to your ember app router.js`);
	}
	return 0;
}
const makemodel = function*(name, fields, options) {
	Kmetadata.database.models[name] = fields;
	let definition = {
		model: {},
		extra: {},
		relations: {}
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

		yield makeembermodel(definition, fields, name, options);
	}
	return 0;
}
*/
module.exports = {
	cmd: "model",
	description: `Creates a new model. fields must be sourrounded by \"\".
	${"Fields syntax".yellow}:
		${"field_name"}:${"type".cyan}	${"[ ".yellow+Object.keys(datatypes).map((c)=>{return c.toLowerCase().cyan}).join( " | ".yellow )+" ]".yellow}
	${"example:".yellow}
		koaton model User "active:integer name email password note:text created:date"\r\n\t\tkoaton model User hasmany Phone phones phoneId
`,
	args: ["name", "fields|linkaction", "[destmodel]", "as", "[relation_property]", "[foreign_key]"],
	options: [
		["-e", "--ember <app>", "Generates the model also for the app especified."],
		["-f", "--force", "Deletes the model if exists."],
		["-r", "--rest", "Makes the model REST enabled."]
	],
	action: function*(name, fields, destmodel, as, relation_property, foreign_key, options) {
		let cmd = `koaton model ${name} ${fields} ${destmodel||""} ${as||""} ${relation_property||""} ${foreign_key||""}`;
		if (Kmetadata.commands.indexOf(cmd) === -1) {
			Kmetadata.commands.push(cmd);
		}
		foreign_key = foreign_key || "";
		if (name === undefined) {
			console.log('\n' + require('./help').single(module.exports));
			return 1;
		}
		let linkaction = null;
		utils = require('../utils');
		inflector = require('i')();
		inflections = require(process.cwd() + '/config/inflections');
		inflections.irregular.forEach((inflect) => {
			inflector.inflections.irregular(inflect[0], inflect[1]);
		});
		let relations = Kmetadata.database.relations[name];
		if (as === "as") {
			linkaction = linkactions[fields.toLowerCase()]
			destmodel = inflector.singularize(destmodel.toLowerCase());
			let relation = {};
			relation[`${relation_property}`] = `${emberrel[linkaction]} ${destmodel} ${foreign_key}`;
			relations.push(relation);
		}
		name = inflector.singularize(name.toLowerCase());
		let modelmaker = require('../modelmanager'),
			models = Kmetadata.database.models,
			m = modelmaker(name, fields, relations, models),
			override = yield utils.challenge(ProyPath("models", `${name.toLowerCase()}.js`), `The model ${name.green} already exits,do you want to override it?`, options.force),
			modelMeta = m.toMeta();
		if (override) {
			yield utils.write(ProyPath("models", name + ".js"), m.toCaminte());
			if (options.rest) {
				var restcontroller = `"use strict";\nmodule.exports = {\n\tREST:true\n};`;
				yield utils.write(ProyPath("controllers", `${name.toLowerCase()}.js`), restcontroller);
			}
		}
		if (override && options.ember) {
			if (!fs.existsSync(ProyPath("/ember/", options.ember))) {
				console.log(`The app ${options.ember} does not exists.`.red);
				return 1;
			}
			yield utils.write(ProyPath("ember", options.ember, "app", "models", name + ".js"), m.toEmberModel());
			if (options.rest) {
				yield utils.write(ProyPath("ember", options.ember, "app", "controllers", `${name}.js`), m.toCRUDTable());
				yield utils.write(
					ProyPath("ember", options.ember, "app", "templates", `${name}.hbs`),
					`{{crud-table\n\tfields=this.fieldDefinition\n}}`
				);
				let router = yield utils.read(path.join(process.cwd(), "ember", options.ember, "app", "router.js"), {
					encoding: "utf-8"
				});
				if (router.indexOf(`this.route('${name}')`) === -1) {
					router = router.replace(/Router.map\(.*?function\(.*?\).*?{/igm, `Router.map(function() {\n\tthis.route('${name}');\n`);
					yield utils.write(path.join(process.cwd(), "ember", options.ember, "app", "router.js"), router, 1);
				}
			}
		}
		Kmetadata.database.models[name] = modelMeta.model;
		while (Kmetadata.database.relations[name] && Kmetadata.database.relations[name].length > 0) {
			Kmetadata.database.relations[name].pop();
		}
		modelMeta.relations.forEach((relation) => {
			Kmetadata.database.relations[name].push(relation);
		});
		console.log();
		return 0;
	}
};
