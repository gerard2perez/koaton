"use strict";
module.exports=(router)=>{
	router.get('/',function *(){
		this.layout="";
		yield this.render('index.html');
	});

	router.get('/login',function *(){
		this.layout=null;
		yield this.render('login.html');
	});
};
