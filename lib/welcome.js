"use strict";
require('colors');
const linesize=59;
const version = require('../package.json').version;
const name = "Koaton";
const ll = name.length > version.length ? name.length : version.length;
const spaces = function(text) {
    while (text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,"").length < ll) {
        text += " ";
    }
    return text;
};
function center(text) {
	var m = Math.floor((linesize - text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,"").length) / 2);
	var r = "";
	while (r.length < m) {
		r += " ";
	}
	return r + text;
}
const line1=function(dodim){
	let p = linesize - 6;
	process.stdout.write("===".grey);
	let fill = "";
	while(p>0){
		fill += "-";
		p--;
	}
	process.stdout.write(dodim?fill.dim:fill);
	process.stdout.write("===\n".grey);
}
const line2=function(){
	let p = Math.floor((linesize-3-3-3)/2);
	let fill = "";
	while(p>0){
		fill+="-";
		p--;
	}
	console.log("   " + (fill+"==="+fill).dim + "   ");
}
const flame =
    center(spaces("") + `      :.           `.red) + "\n" +
    center(spaces("") + `    .!>:;         `.red) + "\n" +
    center(spaces("K".gray.bold.italic + "oaton".grey) + `    .!!!!!:.      `.red) + "\n" +
    center(spaces("v" + version) + `     .-!!!:;      `.red) + "\n" +
    center(spaces("") + `      ::;>77!.     `.red) + "\n" +
    center(spaces("") + `  -.  !7>7??7:;.   `.red) + "\n" +
    center(spaces("") + ` ;>;.!7?7???7!>>.  `.red) + "\n" +
    center(spaces("") + `;>7;;>?????77777-  `.red) + "\n" +
    center(spaces("") + `;>77!>7????????7:  `.red) + "\n" +
    center(spaces("") + ` ;!777????????7:.  `.red) + "\n" +
    center(spaces("") + `   .-:!!>>!!:;. `.red);
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
		line1();

    },
    lift(env, buildreport) {
		let jutsus = require('./jutsus');
		jutsus = jutsus.S.concat(jutsus.A, jutsus.B, jutsus.C);
		const index = Math.floor((Math.random() * jutsus.length));
		line1(true);
		console.log(center("Koaton: " + jutsus[index].name.red));
        line2();
        console.log(`   Server running in ${process.cwd()}\n` +
            `   To see your app, visit ` + `http://localhost:${env.port}\n`.underline +
            `   To shut down Koaton, press <CTRL> + C at any time.`);
		line2();
		console.log();
        Promise.all(buildreport).then((reports) => {
            if (reports.length > 0) {
                console.log("   Ember apps:");
                console.log("     " + reports.map((r)=>{return r.result}).join('\n     '));
            }
            console.log("===".grey + "-----------------------------------------------------".dim + "===".grey);
            console.log(`  Enviroment:\t\t${env.NODE_ENV.green}`);
            console.log(`  Port:\t\t\t${env.port.toString().green}`);
			reports.forEach((r)=>{
				r.log=true;
			});
        });


    }
};
