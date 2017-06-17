import * as JSURL from 'jsurl';
async function jsurl (ctx, next) {
	if (ctx.query && ctx.query.filterset) {
		ctx.query.filterset = JSURL.tryParse(ctx.query.filterset, []);
	}
	await next();
}
export default jsurl;
