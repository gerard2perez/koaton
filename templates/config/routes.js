"use strict";
module.exports=(router)=>{
	router.get('/',function *(next){
		this.layout="";
		console.log(this);
		yield this.render('index.html');
	});
};