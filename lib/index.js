"use strict";
var Koa = require(process.cwd() + '/node_modules/koa');
const colors = require('colors');
var version = require('../package.json').version;
var app = new Koa();

app.views = require('./views')(app);
app.orm = require('./orm')(app);
app.router = require('./router')(app);

if (process.env.NODE_ENV === "development") {
    app.use(require(process.cwd() + '/node_modules/koa-logger')());
}
app.start = function(port, cb) {
    app.listen(port, function() {
        if (!(process.env.welcome === 'false') && process.env.NODE_ENV === "development") {
            console.log("Starting Server".grey + " ...".grey.dim);
            var name = "Koaton";
            var ll = name.length > version.length ? name.length : version.length;
            var spaces = function(text) {
                while (text.length < ll) {
                    text += " ";
                }
                return text;
            };
            var fill = function(n) {
                var r = "";
                while (r.length < n) {
                    r += " ";
                }
                return r;
            }
            var flame =
                fill(15) + spaces("") + `      :.           `.red + "\n" +
                fill(15) + spaces("") + `    .!>:;         `.red + "\n" +
                fill(10) + spaces("K".gray.bold.italic + "oaton".grey) + fill(5) + `    .!!!!!:.      `.red + "\n" +
                fill(10) + spaces("v" + version) + fill(5) + `     .-!!!:;      `.red + "\n" +
                fill(15) + spaces("") + `      ::;>77!.     `.red + "\n" +
                fill(15) + spaces("") + `  -.  !7>7??7:;.   `.red + "\n" +
                fill(15) + spaces("") + ` ;>;.!7?7???7!>>.  `.red + "\n" +
                fill(15) + spaces("") + `;>7;;>?????77777-  `.red + "\n" +
                fill(15) + spaces("") + `;>77!>7????????7:  `.red + "\n" +
                fill(15) + spaces("") + ` ;!777????????7:.  `.red + "\n" +
                fill(15) + spaces("") + `   .-:!!>>!!:;. `.red;

            console.log(
                flame
                .replace(/!/gim, "!".dim.italic.bold)
                .replace(/:/gim, ":".bold)
                .replace(/\?/gim, "?".dim)
                .replace(/\./gim, ".".dim.bold)
            );
            console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
            console.log("   " + "-------------------------===-------------------------".dim + "   ");
            console.log(`   Server running in ${process.env.PWD}\n` +
                `   To see your app, visit ` + `http://localhost:${port}\n`.underline +
                `   To shut down Koaton, press <CTRL> + C at any time.`);
            console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
            console.log('   Enviroment:\t\t' + (process.env.NODE_ENV).green);
            console.log('   Port:\t\t' + (port + "").green);
            cb && cb();
        }else{
			console.log("Running on port "+port)
		}
    });
};

module.exports = app;