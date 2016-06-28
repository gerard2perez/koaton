"use-strict";
const getuser = require("koaton/lib/auth").getuser;
module.exports = {
	model: "user",
	username: "username",
	password: "password",
	strategies: {
		local: {
			package: "passport-local",
			identifier: "local",
			options: {
				session: true
			},
			secret: getuser
		}
	}
};
