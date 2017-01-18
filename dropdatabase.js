var join = require('upath').join;
var mongoose = require(join(process.cwd(), 'testingapp/node_modules/mongoose'));
mongoose.connect('mongodb://localhost/testingapp');
let con = mongoose.connection;
con.once('open', function () {
	console.log('Connected to DB');
	con.dropDatabase();
	con.close(() => {
		console.log('Connection Closed');
	});
});
