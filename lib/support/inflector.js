'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

const inflector = require('inflection');

const inflections = Object.assign({}, {
	plural: [],
	singular: []
}, requireSafe(ProyPath('config', 'inflections'), {}));

for (const inflect in inflections.singular) {
	inflector.singular(...inflect);
}

for (const inflect in inflections.plural) {
	inflector.pluralize(...inflect);
}
exports.default = inflector;