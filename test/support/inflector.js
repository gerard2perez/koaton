/*global describe, it*/
import * as assert from 'assert';
import * as fs from 'fs-extra';

let inflectorFile = `
module.exports={
	plural:[['person','people']],
	singular:[['mice','mouse']],
	irregular:[['chilaquil','chilaquiles']],
	uncountable:['oil']
}
`;

fs.outputFileSync(ProyPath('config', 'inflections.js'), inflectorFile);
const inflector = require('../../../src/support/inflector').default;

fs.removeSync(ProyPath('config'));

describe('Inflector', function() {
	it('person <-> people', function() {
		assert.equal("person", inflector.singularize('people'), 'singular');
		assert.equal("people", inflector.pluralize('person'), 'plural');
	});

	it('mice <-> mouse', function() {
		assert.equal("mouse", inflector.singularize('mice'), 'singular');
		assert.equal("mice", inflector.pluralize('mouse'), 'plural');
	});
	it('chilaquil <-> chilaquiles', function() {
		assert.equal("chilaquil", inflector.singularize('chilaquiles'), 'singular');
		assert.equal("chilaquiles", inflector.pluralize('chilaquil'), 'plural');
	});
	it('oil <-> oil', function() {
		assert.equal("oil", inflector.singularize('oil'), 'singular');
		assert.equal("oil", inflector.pluralize('oil'), 'plural');
	});

});
