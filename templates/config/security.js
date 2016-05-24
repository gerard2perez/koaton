"use-strict";

module.exports = {
	model: "user",
	strategies: {
		local: {
			user:"user",
			password:"password",
			callback:function*(err,user,info){
				console.log("user");
			}
		}
	}

};
