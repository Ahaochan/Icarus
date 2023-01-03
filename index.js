"use strict"
// 登录
const qq = ''
const { createClient } = require("oicq")
const botClient = createClient(qq);
botClient.on("system.login.qrcode", function (e) {
	//扫码后按回车登录
	process.stdin.once("data", () => this.login())
}).login()

exports.bot = botClient;

// template plugins
require("./plugin/plugin-qinglong-bot") // 青龙bot
require("./plugin/plugin-xianbao") // 线报
// require("./cron") // 线报
// require("./plugins/plugin-hello") //hello world
// require("./plugin-image") //发送图文和表情
require("./plugin/sample-request") //加群和好友
require("./plugin/sample-online") //监听上线事件

process.on('uncaughtException',function(err){
	console.error('未捕获的异常', err);
})

process.on('unhandledRejection', function (err, promise) {
	console.error('有Promise没有被捕获的失败函数', err);
})