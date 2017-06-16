const spawn = require('cross-spawn').sync;
const spawnAsync = require('cross-spawn');
const fs = require('fs-extra');
const path = require('upath');

const buildHosts = function buildHosts () {
	const os = require('os');

	let subdomains = configuration.server.subdomains;

	if (subdomains.indexOf('www') === -1) {
		subdomains.push('www');
	}
	let hostsdlocation = '';
	switch (os.platform()) {
		case 'darwin':
			hostsdlocation = '/private/etc/hosts';
			break;
		case 'linux':
			hostsdlocation = '/etc/hosts';
			break;
		case 'win32':
			hostsdlocation = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
			break;
		default:
			console.log("your os is not detected, hosts files won't be updated".red);
			break;
	}
	if (hostsdlocation !== '') {
		let hostsd = fs.readFileSync(hostsdlocation, 'utf-8');
		for (const subdomain of subdomains) {
			let entry = `127.0.0.1\t${subdomain}.${configuration.server.host}`;
			if (hostsd.indexOf(entry) === -1) {
				hostsd += '\n' + entry;
				hostsd += `\n127.0.0.1\t${configuration.server.host}`;
				hostsd += `\n127.0.0.1\t${configuration.server.host}`.replace('test', 't3st');
			}
		}
		fs.writeFileSync(hostsdlocation, hostsd.replace(/\n+/igm, '\n'));
	}
};
let nginxpath;

function getnginxpath () {
	if (nginxpath === undefined) {
		let log = spawn('nginx', ['-t']);
		log = log.stdout.toString() || log.stderr.toString();
		nginxpath = path.resolve(log.toString().match(/.* file (.*)nginx\.conf test/)[1]);
	}
	let conf = fs.readFileSync(path.join(nginxpath, 'nginx.conf'), 'utf-8');
	if (conf.indexOf('include enabled_sites/*') === -1) {
		conf = conf.replace(/http ?\{/igm, 'http {\n\tinclude enabled_sites/*.conf;');
		fs.writeFileSync(path.join(nginxpath, 'nginx.conf'), conf);
		fs.mkdirsSync(path.join(nginxpath, 'enabled_sites'));
	}
	let confFile = 'testingapp.conf';
	fs.copySync(ProyPath(confFile), path.join(nginxpath, 'enabled_sites', confFile));
	let res = spawn('nginx', ['-s', 'reopen']).stderr.toString();

	while (res.indexOf('error') > -1) {
		spawnAsync('nginx', []);
		res = spawn('nginx', ['-s', 'reopen']).stderr.toString();
	}
	return nginxpath;
}
module.exports = {
	getnginxpath: getnginxpath,
	buildHosts: buildHosts
};
