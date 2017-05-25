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
	var pids = ex.getPid(['node', args.port]);
	console.log({pids});
	pids.forEach(pid => ex.kill(pid));

	//step2 - delete old files
	fs.existsSync(dir) && fs2.rmdir(dir);

	//step3 - add new files
	fs.mkdirSync(dir);
	ex.unTar(`${args.dir}/bin.tar.gz`, dir);

	//step4 - install dependence
	if (fs.existsSync(`${dir}/package.json`)) {
		cmd('cp web/package.json package.json', args.dir);
		cmd(args.env === 'dev' ? 'npm run taobao' : 'npm install', args.dir);
	}

	//step5 - run node
	if (fs.existsSync(`${dir}/server.js`)) {
		var date = args.time.split('_')[0];
		var logFile = `${args.dir}/logs/${date}.log`;
		cmd(`nohup npm start node=${args.node} env=${args.env} port=${args.port} time=${args.time} puber=${args.puber} > ${logFile} 2>&1 &`, dir);
	}
};

doDeploy();