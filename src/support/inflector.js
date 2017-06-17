import * as i from 'i';
const inflector = i();

/** @ignore */
const inflections = Object.assign({}, {
	plural: [],
	singular: [],
	irregular: [],
	uncountable: []
}, configuration.inflections);

for (const inflect of inflections.singular) {
	inflector.inflections.singular(...inflect);
}
for (const inflect of inflections.irregular) {
	inflector.inflections.irregular(...inflect);
}
for (const inflect of inflections.plural) {
	inflector.inflections.plural(...inflect);
}
for (const inflect of inflections.uncountable) {
	inflector.inflections.uncountable(...inflect);
}
/**
 * Reads the information from config/inflections.js in order to populete the inflector with custom inflections.
 * @type {inflector}
 * @property {function(plural: String)} singularize - return the singular of the given word
 * @property {function(singular: String)} pluralize - return the plural of the given word
 * @property {function(word: String)} camelize - return the word in a camel case format
 */
export default inflector;
