import { buildHosts } from '../support/prepareEnv';

process.chdir('testingapp');
process.env.port = 62650;
process.env.NODE_ENV = 'development';

let koaton = require('../../src');
if (!process.env.TRAVIS) {
	buildHosts();
}
koaton.use(koaton.localization);
koaton.use(koaton.cached);
koaton.use(koaton.helmet);
koaton.use(koaton.bodyparser);
koaton.use(koaton.jsurl);
koaton.use(koaton.static);
koaton.use(koaton.session(koaton));
koaton.use(koaton.passport.initialize());
koaton.use(koaton.passport.session());
koaton.use(koaton.oAuth2Server);
koaton.use(koaton.i18nHelper);
koaton.use(koaton.views);
koaton.use(koaton.subdomainrouter);

koaton = koaton.start(process.env.port);

describe('Koaton Unit Testing', function () {
	beforeEach(function () {
		this.timeout(1000 * 60 * 100);
	});
	after(function () {
		koaton.close();
		process.chdir('..');
	});
	require('./html_response');
	require('./simple_models');
	require('./authentication');
	require('./related_models');
	require('./filterset');
	require('./cleanup');
});
