import { buildHosts } from '../support/prepareEnv';

process.chdir('testingapp');
process.env.port = 62650;
process.env.NODE_ENV = 'development';

let koaton = require('../../src');

buildHosts();

koaton.use(koaton.detectsubdomain);
koaton.use(koaton.conditional);
koaton.use(require('koa-helmet')());
koaton.use(require('koa-bodyparser')({}));
koaton.keys = configuration.keys;
koaton.use(require('koa-session')(koaton));
koaton.use(koaton.passport.initialize());
koaton.use(koaton.passport.session());
koaton.use(koaton.oAuth2Server);
koaton.use(koaton.views);
koaton.use(koaton.subdomainrouter);

koaton = koaton.start(process.env.port);

// process.env.NODE_ENV = 'production';

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
});
