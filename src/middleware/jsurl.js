import * as JSURL from 'jsurl';
/**
 * This middleware decodes the query param filterset which is expected in a jsurl format
 * and appends jsurl to ctx.state
 * @param {KoaContext} ctx
 * @param {KoaNext} next
 * @param {JSURL} ctx.state.jsurl - reference attached.
 */
export default async function jsurl (ctx, next) {
	ctx.state.jsurl = JSURL;
	if (ctx.query && ctx.query.filterset) {
		ctx.query.filterset = JSURL.tryParse(ctx.query.filterset, []);
	}
	await next();
}
