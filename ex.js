var os = require('os');
var {cmd,getCmd} = require('ifun');

//获取进程ID
//如找不到pid返回0
exports.getPid = function(keywords){
	var ps = process.platform=='linux' ? 'ps -aux' : 'ps aux';
	var stdout = getCmd(ps);
	var plist = stdout.split('\n');
	var pid = 0;
	plist.some(function(line){
		var isMatch = keywords.every(function(keyword){
			return line.includes(keyword);
		});
		if(isMatch) {
			var _pid = line.trim().split(/\s+/)[1];
			if(_pid == process.pid){
				isMatch = false;
			}else{
				pid = _pid;
			}
		}
		return isMatch;
	});
	return pid;
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