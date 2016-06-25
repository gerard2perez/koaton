import Ember from 'ember';
export function initialize(/* container, application */) {
  var inflector = Ember.Inflector.inflector;
  var irregular = {{irregular}};
  var uncontable = {{uncontable}};
  irregular.forEach(function(inflection){
	  inflector.irregular(inflection[0],inflection[1]);
  });
  uncontable.forEach(function(inflection){
	  inflector.uncontable(inflection);
  });
}
export default {
  name: 'inflector',
  initialize: initialize
};
