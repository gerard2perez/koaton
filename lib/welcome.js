"use strict";
require('colors');
const version = require('../package.json').version;
const name = "Koaton";
const ll = name.length > version.length ? name.length : version.length;
const spaces = function(text) {
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
const flame =
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
module.exports = {
    start() {
        console.log("Starting Server".grey + " ...".grey.dim);
        console.log(
            flame
            .replace(/!/gim, "!".dim.italic.bold)
            .replace(/:/gim, ":".bold)
            .replace(/\?/gim, "?".dim)
            .replace(/\./gim, ".".dim.bold)
        );
        console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);

    },
    lift(env, buildreport) {
        console.log();
        console.log("   " + "-------------------------===-------------------------".dim + "   ");
        console.log(`   Server running in ${process.cwd()}\n` +
            `   To see your app, visit ` + `http://localhost:${env.port}\n`.underline +
            `   To shut down Koaton, press <CTRL> + C at any time.`);
        console.log();
		console.log();
        Promise.all(buildreport).then((reports) => {
            if (reports.length > 0) {
                console.log("   Ember apps:");
                console.log("     " + reports.join('\n     '));
            }
            console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
            console.log(`  Enviroment:\t\t${env.NODE_ENV.green}`);
            console.log(`  Port:\t\t\t${env.port.toString().green}`);
        });


    }
};
