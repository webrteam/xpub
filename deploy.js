/**
 * 发版(服务端)
 */

var fs = require('fs');
var fs2 = require('./fs2');
var ex = require('./ex');
var {getArgs, cmd} = require('ifun');
console.log({cmd: cmd.toString()})

var doDeploy = function (ua) {
	var args = getArgs('cmd');
	args.node = args.node || args.env;
	args.java = args.java || args.env;
	var env = args.env || 'test';

	var dir = `${args.dir}/web`;

	//step1 - stop node
	var pid = ex.getPid(['deploy', args.port]);
	console.log({pid});
	pid && ex.kill(pid);

	//step2 - delete old files
	fs.existsSync(dir) && fs2.rmdir(dir);

	//step3 - add new files
	fs.mkdirSync(dir);
	ex.unTar(`${args.dir}/bin.tar.gz`, dir);

	//step4 - run node
	cmd('cp web/package.json package.json', args.dir);
	cmd('npm run taobao', args.dir);
	var logFile = `${args.dir}/logs/1.log`;
	args.cmd = 'start';
	args.dir = dir;
	//start(ua, args);
	console.log({env});
	cmd(`nohup npm start node=local env=${env} port=8000 > ${logFile} 2>&1 &`, dir);

};

doDeploy();