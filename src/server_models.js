export default {
	oauth2accesstoken(schema) {
		return {
			"model": {
				"UserId": {
					type: schema.String
				},
				"Token": {
					type: schema.String
				},
				"RefreshToken": {
					type: schema.String
				},
				"ApplicationId": {
					type: schema.String
				},
				"Expires": {
					type: schema.Date
				},
				"Scope": {
					type: schema.Text
				}
			},
			"extra": {
				TimeStamps:false
			},
			relations:{}
		};
	},
	oauth2application(schema) {
		return {
			"model": {
				"ClientId": {
					type: schema.String
				},
				"UserId": {
					type: schema.String
				},
				"ClientType": {
					type: schema.String
				},
				"AuthorizationGrantType": {
					type: schema.String
				},
				"ClientSecret": {
					type: schema.String
				},
				"Name": {
					type: schema.String
				},
				"Skip":{
					type:schema.Boolean
				}
			},
			"extra": {},
			relations:{}
		};
	}
};
