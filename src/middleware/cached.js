import * as calculate from 'etag';
import * as Stream from 'stream';
import * as fs from 'fs-extra';

/** @ignore */
/* istanbul ignore next*/
function noop () {}
/** @ignore */
const stat = function stat (path) {
	return new Promise(function (resolve) {
		fs.stat(path, function (err, stats) {
			/* istanbul ignore if */
			if (err) {
				throw err;
			}
			resolve(stats);
		});
	});
};
/**
 * Middleware for eTag generation (cached content)
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 */
export default async function cached (ctx, next) {
	await next();
	const body = ctx.body;
	/* istanbul ignore if */
	if (!body || ctx.response.get('ETag') || ctx.state.nocache) return;
	const status = ctx.status / 100 | 0;
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
}
