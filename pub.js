#!/usr/bin/env node

/**
 * 发版客户端脚本
 */

var fs = require('fs');
var {log,end,cmd,getArgs,getCurrentBranch} = require('ifun');
var ex = require('./ex');
var {getIp} = ex;

var config = {};
var args = {};
var pub = {};

var ua = {};
ua.engine = {name, version};
ua.ip = getIp();
ua.path = process.cwd();
ua.user = process.env.USER || process.env.USERNAME;
ua.sudo = process.platform != 'win32' && ua.user != 'root' ? 'sudo ' : '';
ua.npm = process.platform == 'win32' ? 'npm.cmd' : 'npm';

var start;
var mid;
var pub;
var next;
var ips;
var way;

var pubIndex = -1;
var pubCount = 0;

var cmdList;
var tarFile;
var sshArgs;
var isShow;

//cmd对外接口
var cmdFun = function (cmdExp) {
	cmdList.push(cmdExp);
};

var getDateTime = function () {
	var timestamp = Date.now() - new Date().getTimezoneOffset() * 60000;
	return new Date(timestamp).toISOString().replace(/:[^:]*$/, '').replace(/\W/g, '').replace('T', '_');
};

//获取参数
var getParams = function () {
	var remote = [];
	if (mid) {
		delete mid[start.next];
		for (let m in mid) {
			let item = mid[m];
			for (let k in item) {
				item[k] && remote.push(`mid.${m}.${k}=${item[k]}`);
			}
		}
	}

	for (let k in pub) {
		pub[k] && typeof(pub[k]) != 'object' && remote.push(`pub.${k}=${pub[k]}`);
	}
	remote = remote.join(' ');


	if (next) {
		var _start = {
			puber: start.puber,
			time: start.time,
			dir: next.dir,
			rose: next.rose
		};
		if (next.keyDir) {
			_start.keyDir = next.keyDir;
		}
	}

	var local = [];
	for (let k in _start) {
		_start[k] && local.push(`${k}=${_start[k]}`);
	}
	local = local.join(' ');

	return {local, remote};
};

//上传前检查
var chkPubBefore = function () {
	config.onPubBefore && !args.onlyPub && config.onPubBefore(cmdFun);
	cmdList.length > 0 ? runCmd() : startPub();
};

//上传前循环执行命令
var runCmd = function () {
	var cmdExp = cmdList.shift();
	if (cmdExp) {
		cmd(cmdExp, start.dir, code => {
			if (code == 0) {
				runCmd();
			} else {
				log('pub before fail!');
			}
		});
	} else {
		log('pub before success!');
		startPub();
	}
};

//获取所有的Node依赖文件
var getNodeDeps = function (currentFile, deps, isLoaded) {
	if (isLoaded[currentFile]) {
		return [];
	} else {
		isLoaded[currentFile] = true;
		deps.push(currentFile);
		fs.getFileSync(currentFile).replace(/require\((.+?)\)/g, function (_, file) {
			var subDeps = getNodeDeps(file, deps, isLoaded);
			deps = deps.concat(subDeps);
		});
	}
	return deps;
};

//开始上传
var startPub = function () {
	next = mid && mid[start.next] || pub;
	ips = next.host.split(',');
	pubIndex = 0;
	pubCount = ips.length;

	tarFile = `${start.dir}/bin.tar.gz`;
	if (start.rose == 'pack') {
		pack();
	} else {
		publishBegin();
	}
};

//打包
var pack = function () {
	var source = fs.readdirSync('.').filter(x=>x!='node_modules' && x[0]!='.').join(' ');
	var cmdExp = `tar -zcf ${tarFile} ${source}`;
	cmd(cmdExp, start.dir, publishBegin);
};

//获取key
var getSshKey = function (key, dir) {
	if (key) {
		if (dir) {
			key = `${dir}/${key}`;
		}
		log({key});
		if (fs.existsSync(key)) {
			var mode = fs.statSync(key).mode.toString(8);
			if (/[40]{3}$/.test(mode)) {
				return `-i ${key}`;
			} else {
				throw 'the key file must locked, please use the [chmod] command to change mode!';
			}
		} else {
			throw `the key path '${key}' is no exist!`;
		}
	}
	return '';
};

//数字to第几
var getTh = function (n) {
	return n + ([0, 'st', 'nd', 'rd'][n] || 'th');
};

//开始发版
var publishBegin = function () {
	way = `${start.env}->${next.env}:`;
	args.show && log({pubIndex, pubCount});
	if (pubCount > 1) {
		log('\n===================================\n');
		log(`now is publishing the ${getTh(pubIndex + 1)} machine:`);
	}
	log({start, next})
	sshArgs = getSshKey(next.key, start.keyDir);
	start.rose == 'login' ? publish() : uploadPackage();
};

//上传压缩包
var uploadPackage = function () {
	log(`${way} uploading...`);

	if (args.parallel) {
		cmd(`cp ${tarFile} ${pub.dir}/bin.tar.gz`, uploadPackageFinish);
	} else {
		var ip = ips[pubIndex];
		var cmdExp = `scp ${sshArgs} ${tarFile} ${next.user}@${ip}:${next.dir}/bin.tar.gz`;
		cmd(cmdExp, start.dir, uploadPackageFinish);
	}
};

//上传压缩包完成
var uploadPackageFinish = function (code) {
	if (code != 0) {
		end(`${way} upload fail!`);
	}
	log(`${way} upload success!`);
	publish();
};

//发版
var publish = function () {
	var ip = ips[pubIndex];
	var cmdExp = `ssh ${sshArgs} ${next.user}@${ip}`.split(/\s+/);

	if (next.rose == 'deploy') {
		log(`${way} publishing...`);
		//var date = start.time.split('_')[0];
		var params = ['deploy'];
		var nodeEnv =  args.node || args.env;
		args.port && params.push(`port=${args.port}`);
		nodeEnv && params.push(`node=${nodeEnv}`);
		args.env && params.push(`env=${args.env}`);
		pub.dir && params.push(`dir=${pub.dir}`);
		start.time && params.push(`time=${start.time}`);
		start.puber && params.push(`puber=${start.puber}`);
		var deployCmdExp = params.join(' ');
		if (args.parallel) {
			cmdExp = deployCmdExp;
		} else {
			cmdExp.push(`'${deployCmdExp}'`);
		}
	} else if (next.rose) {
		log(`${way} logining...`);
		var {local,remote} = getParams();
		cmdExp.push(`'pub ${args.env} ${isShow} ${local} ${remote}'`);
	}

	cmd(cmdExp, start.dir, publishFinish);
};

//发版完成
var publishFinish = function (code) {
	if (code != 0) {
		end(`${way} publish fail!`);
	}
	if (pubCount > 1) {
		log(`the ${getTh(pubIndex + 1)} machine publish finish!`);
		pubIndex++;
		if (pubIndex < pubCount) {
			return publishBegin();
		}
	}
	cmd(`rm -rf ${tarFile}`, start.dir);
	log(`${way} publish success!`);
};

//分析线路
var parseLine = function () {
	var items = {};
	var item = start = items.start = pub.start || {};
	//start.env = start.env || args.env;  //because nobox pub test
	start.env = start.env || 'local';
	start.dir = args.dir || '.'; //用.而不是process.cwd()是怕window路径引起的问题
	start.rose = start.rose || args.rose || 'pack';
	start.keyDir = start.keyDir || args.keyDir;
	start.puber = start.puber || args.puber || ua.user || ua.ip || 'unknown';
	start.time = args.time || getDateTime();
	mid = pub.mid || args.mid;
	for (let m in mid) {
		item.next = m;
		item = mid[m];
		item.rose = item.rose || 'upload';
		if (item.rose == 'pack') {
			for (let m2 in items) {
				items[m2].rose = 'login';
			}
		}
		items[m] = item;
	}
	pub.user = pub.user || 'root';
	pub.rose = 'deploy';
	pub.env = item.next = args.env || 'remote';
	delete pub.start;
	delete pub.mid;
	args.show && log({start, mid, pub});
};

var iniPub = function (_ua) {
	ua = _ua;
	args = getArgs('env');
	isShow = args.show ? '--show' : '';

	cmdList = [];
	log({ua, args});
	var configFile = `${args.dir || ua.path}/config/pub.js`;
	if (fs.existsSync(configFile)) {
		pub = require(configFile);
	}
	if (typeof pub === 'function') {
		pub = pub(args, ua);
	}
	log({pub});
	if (!pub) {
		throw 'please setting publish option [pub] before!';
	}
	if (args.pub) {
		for (var k in args.pub) {
			pub[k] = args.pub[k];
		}
	}
	parseLine();
	args.currentBranch = getCurrentBranch(start.dir);

	if (!pub.dir) {
		throw 'please setting option [pub.dir] before!';
	}

	if (!args.parallel) {
		if (!pub.host) {
			throw 'please setting option [pub.host] before!';
		}
	}
	args.show && log({config});
	start.rose == 'pack' ? chkPubBefore() : startPub();
};


global.log = console.log;
var {name,version} = require('./package.json');


iniPub(ua);