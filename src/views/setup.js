import { sync as glob } from 'glob';
import { basename } from 'upath';
import * as fs from 'fs-extra';

const SetUp = {
	handlebars () {
		const Handlebars = require(ProyPath('node_modules', 'handlebars'));
		const layouts = require(ProyPath('node_modules', 'handlebars-layouts'));
		Handlebars.registerHelper(layouts(Handlebars));
		// Bundles
		Handlebars.registerHelper('bundle', function (bundle) {
			if (Kmetadata.bundles[bundle] === undefined) {
				return '';
			}
			return Kmetadata.bundles[bundle].toString();
		});
		// Localition
		Handlebars.registerHelper('i18n', function (key, locale, helper) {
			if (helper) {
				let loc = i18n.getLocale();
				i18n.setLocale(locale);
				let res = i18n.__(key);
				i18n.setLocale(loc);
				return res;
			} else {
				return i18n.__(key);
			}
		});
		const layoutFiles = glob(ProyPath('views', 'layouts', '*.handlebars')).concat(glob(ProyPath('koaton_modules', '**', 'views', 'layouts', '*.handlebars')));
		for (const file of layoutFiles) {
			Handlebars.registerPartial(basename(file).replace('.handlebars', ''), fs.readFileSync(file, 'utf8'));
		}
		return Handlebars;
	},
	nunjucks () {
		const nunjucks = require(ProyPath('node_modules', 'nunjucks'));
		const env = new nunjucks.Environment();
		env.addFilter('bundle', function (bundle) {
			if (Kmetadata.bundles[bundle] === undefined) {
				return '';
			}
			return Kmetadata.bundles[bundle].toString();
		});
		return env;
	}
};

export default SetUp;
