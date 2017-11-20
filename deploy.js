#!/usr/bin/env node

/**
 * 发版(服务端)
 */

var fs = require('fs');
var fs2 = require('./fs2');
var ex = require('./ex');
var {getArgs, cmd} = require('ifun');

var doDeploy = function (ua) {
	var args = getArgs();
	var dir = `${args.dir}/web`;

	//step1 - stop node
	var pids = ex.getPid(['node', `port=${args.port}`]);
	console.log({pids});
	pids.forEach(pid => ex.kill(pid));

	//step2 - delete old files
	fs.existsSync(dir) && fs2.rmdir(dir);

	//step3 - add new files
	fs.mkdirSync(dir);
	ex.unTar(`${args.dir}/bin.tar.gz`, dir);

	//step4 - install dependence
	if (fs.existsSync(`${dir}/package.json`)) {
		cmd(args.env === 'dev' ? 'npm run taobao' : 'npm install', dir);
	}

	//step5 - run node
	if (fs.existsSync(`${dir}/server.js`)) {
		var date = args.time.split('_')[0];
		var logFile = `${args.dir}/logs/${date}.log`;
		cmd(`nohup node server env=${args.env} dir=${args.dir} time=${args.time} puber=${args.puber} port=${args.port} > ${logFile} 2>&1 &`, dir);
	}
};

doDeploy();