"use strict";
module.exports=(router)=>{
	router.get('/',function *(next){
		this.layout="";
		yield this.render('index.html');
	});
};