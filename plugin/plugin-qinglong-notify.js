"use strict"
const {bot} = require("../index")
const axios = require('axios');
const http = require('http');

// 1. 基础配置
const port = 7788;
const qyapi = '';

// 2. 开启http接口监听
http.createServer().on('request', function (request, response) {
    if (request.method !== 'POST') {
        return;
    }
    let dataStr = '';
    response.setHeader('Content-Type', 'application/json;charset=utf-8');
    request.on('data', chunk => dataStr += chunk)
        .on('end', function () {
            console.log('接收到青龙通知:' + dataStr);

            notify(JSON.parse(dataStr));

            response.end(dataStr);
        });
}).listen(port, function () {
    console.log("服务器已经启动，可访问以下地址：");
    console.log(`http://localhost:port`);
})


function notify(data) {
    const message = data.title + '\n' + data.content;
    if (qyapi) {
        qiwei(message);
    }

    const black = [];
    if(!message.includesAny(black)) {
        const group = bot.pickGroup(608024845, true);
        group.sendMsg(message);
    }
}

function qiwei(message) {
    const body = {
        "msgtype": "text",
        "text": {
            "content": message,
        }
    }
    axios.post(qyapi, body);
}

String.prototype.includesAny = function(array) {
    return array.filter(k => this.indexOf(k) > -1).length > 0;
}