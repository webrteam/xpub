#!/usr/bin/env node

/**
 * 发版客户端脚本
 */

let fs = require('fs');
let { cmd, getArgs } = require('ifun');
let ex = require('./ex');
let {getIp} = ex;

let config = {};
let args = {};
let pub = {};   // 发布参数
let sshArgs = '';
const TarFile = 'bin.tar.gz';

let ua = {};
ua.ip = getIp();
ua.dir = process.cwd();
ua.user = process.env.USER || process.env.USERNAME;
ua.sudo = process.platform != 'win32' && ua.user != 'root' ? 'sudo ' : '';
ua.npm = process.platform == 'win32' ? 'npm.cmd' : 'npm';

let getTime = function () {
	let timestamp = Date.now() - new Date().getTimezoneOffset() * 60000;
	return new Date(timestamp).toISOString().replace(/:[^:]*$/, '').replace(/\W/g, '').replace('T', '_');
};

//获取key
let getSshKey = function (key) {
	if (!key) {
		return '';
	}
	if (fs.existsSync(key) === false) {
		throw `the key path '${key}' is no exist!`;
	}
	let mode = fs.statSync(key).mode.toString(8);
	if (/[40]{3}$/.test(mode) === false) {
		throw 'the key file must locked, please use the [chmod] command to change mode!';
	}
	return `-i ${key}`;
};

let iniPub = function () {
	pub = {};

	args = getArgs('env');
	let { name, version } = require('./package.json');

	if (args.v) {
		console.log(version);
		return;
	}

	pub.localDir = args.localDir || ua.dir;
	let configFile = `${pub.localDir}/config/pub.js`;
	if (fs.existsSync(configFile)) {
		config = require(configFile);
	}
	if (typeof config === 'function') {
		config = config(args, ua);
	}

	pub.host = args.host || config.host;
	pub.port = args.port || config.port || '80';
	pub.user = args.user || config.user || 'root';
	pub.dir = args.dir || config.dir || `/xpub-site/${name}`;
	pub.includes = args.includes || config.includes;
	pub.excludes = args.excludes || config.excludes;
	pub.key = args.key || config.key;
	pub.env = args.env || config.env;
	pub.puber = args.puber || config.puber || ua.user || ua.ip;
	// console.log({ua, config, args, pub});

	if (!pub.host) {
		throw 'please setting [host] before!';
	}
	console.log(`----- publishing to ${pub.env}[${pub.host}] ------`);
	sshArgs = getSshKey(pub.key);
	pack();
};

//打包
let pack = function () {
	console.log(`packing...`);

	let source = [];
	if (pub.includes) {
		source = pub.includes.split(',');
	} else {
		let excludes = pub.excludes || [];
		excludes.push('node_modules', 'package-lock.json');
		source = fs.readdirSync(pub.localDir).filter(x => excludes.indexOf(x) === -1 && x[0] !== '.');
	}
	source =  source.join(' ');
	if (!source) {
		throw 'no source';
	}
	cmd(`tar -zcf ${TarFile} ${source}`, pub.localDir);

	console.log(`pack success!`);
	upload();
};

//上传压缩包
let upload = function () {
	console.log(`uploading...`);

	cmd(`scp ${sshArgs} ${TarFile} ${pub.user}@${pub.host}:${pub.dir}/bin.tar.gz`, pub.localDir);
	cmd(`rm -rf ${TarFile}`, pub.localDir);

	console.log(`upload success!`);
	publish();
};

//发版
let publish = function () {
	console.log(`publishing...`);

	let cmdExp = `ssh ${sshArgs} ${pub.user}@${pub.host}`.split(/\s+/);

	let params = ['deploy'];
	pub.port && params.push(`port=${pub.port}`);
	pub.env && params.push(`env=${pub.env}`);
	pub.dir && params.push(`dir=${pub.dir}`);
	params.push(`time=${getTime()}`);
	pub.puber && params.push(`puber=${pub.puber}`);
	let deployCmdExp = params.join(' ');

	cmdExp.push(`'${deployCmdExp}'`);
	cmd(cmdExp, pub.localDir);

	console.log(`publish success!`);
};

iniPub();