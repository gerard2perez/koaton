import * as calculate from 'etag';
import * as Stream from 'stream';
import * as Promise from 'bluebird';
import * as fs from 'fs-extra';

const stat = Promise.promisify(fs.stat);
const cached = async function cached (ctx, next) {
	await next();
	const body = ctx.body;
	/* istanbul ignore if */
	if (!body || this.response.get('ETag')) return;
	const status = this.status / 100 | 0;
	/* istanbul ignore if */
	if (status !== 2) return;

	let etag;
	if (body instanceof Stream) {
		/* istanbul ignore if */
		if (!body.path) return;
		let stats = await stat(body.path).catch(noop);
		/* istanbul ignore if */
		if (!stats) return;
		etag = calculate(stats, configuration.static.cache.etagWeak);
	} else if ((typeof body === 'string') || Buffer.isBuffer(body)) {
		etag = calculate(body, configuration.static.cache.etagWeak);
	} else {
		etag = calculate(JSON.stringify(body), configuration.static.cache.etagWeak);
	}
	/* istanbul ignore else */
	if (etag) {
		ctx.set('ETag', etag);
	}
	if (ctx.fresh) {
		ctx.set('Cache-Control', 'public,' + ctx.response.get('Cache-Control'));
		ctx.remove('Last-Modified');
		ctx.body = null;
		ctx.status = 304;
	}
};

/* istanbul ignore next*/
function noop () {}

export default cached;
