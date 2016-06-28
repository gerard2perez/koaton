"use strict";
module.exports=(router)=>{
	router.public.get('/',function *(){
		this.layout="";
		yield this.render('index.html');
	});
	router.public.get('/login',function *(){
		this.layout=null;
		yield this.render('login.html');
	});
};
