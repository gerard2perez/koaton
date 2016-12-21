const cached = async function cached(ctx, next) {
	await next();
	if (ctx.fresh) {
		ctx.response.set('Cache-Control', 'public,' + ctx.response.get('Cache-Control'));
		ctx.response.remove('Last-Modified');
		ctx.status = 304;
		ctx.body = null;
	}
	//});
};

export default cached;
