const inflector = require('i')();

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
export default inflector;
