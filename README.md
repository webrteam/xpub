## 欢迎使用express发版机

### 常用命令
* pub/xpub 发版
* deploy 部署

### 发版简单配置
```javascript
module.exports = {
    packages: ["my.config.js", "env.list.js"],
    user: "root",
    dir: "/data/fegroup/2cash",
    port: 3001,
    ip: '192.168.8.1',
    key: ''
}
```

### 发版复杂配置
```javascript
var env = require("./node/env");

module.exports = function(args){
    var [java, node, pub] = env.getEnv(args);
     return {

        //发版之前触发的事件
        onPubBefore: function(cmd){
            cmd(`git pull origin ${args.currentBranch}`);
            cmd("npm run build");
        },

        //发版配置
        pub: {
            packages: ["my.config.js", "env.list.js"],
            user: pub.user || "root",
            dir: pub.dir || "/data/fegroup/2cash",
            port: pub.port || 3001,
            ip: pub.ip,
            key: pub.key
        },

        //发版之后触发的事件
        onPubAfter: function(cmd){
            cmd(`git pull origin ${args.currentBranch}`);
            cmd("npm run build");
        }
    };
};
```