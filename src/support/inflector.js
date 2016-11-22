import * as inflector from 'inflection';


const inflections = Object.assign({}, {
	plural: [],
	singular: []
}, requireSafe(ProyPath('config', 'inflections'), {}));

for (const inflect in inflections.singular) {
	inflector.singularize(...inflect);
}

for (const inflect in inflections.plural) {
	inflector.pluralize(...inflect);
}
export default inflector;
