var os = require('os');
var {cmd,getCmd} = require('ifun');

//获取进程ID
//如找不到pid返回0
exports.getPid = function(keywords){
	var ps = process.platform=='linux' ? 'ps -aux' : 'ps aux';
	//ps = [ps].concat(keywords.map(x=>`grep ${x}`)).join(' | ');
	var pids = [];
	getCmd(ps).split('\n').forEach(line => {
		if (keywords.every(x=>line.includes(x))) {
			console.log({line});
			var _pid = line.trim().split(/\s+/)[1];
			_pid != process.pid && pids.push(_pid);
		}
	});
	return pids;
};

//杀进程
exports.kill = function(pid){
	cmd(`kill -9 ${pid}`);
};

//解压缩
exports.unTar = function(tarFile, unTarDir){
	cmd(`tar -zxf ${tarFile} -C ${unTarDir}/`.replace(/\/\/$/,'/'));
};

//获取IP
exports.getIp = function(){
	try{
		var ips = os.networkInterfaces();
		for(var k in ips) {
			if(/en|eth/.test(k)) {
				var a = ips[k];
				for (var j = 0; j < a.length; j++) {
					var o = a[j];
					if (o.family == 'IPv4' && o.internal === false) {
						return o.address;
					}
				}
			}
		}
	}catch(e){
		return 'localhost';
	}
};