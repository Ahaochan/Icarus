"use strict"
// 登录
const qq = 0;
const pw = '';
const { createClient } = require("icqq")
const botClient=createClient()
botClient.on('system.login.slider', (e) => {
	console.log('输入滑块地址获取的ticket后继续。\n滑块地址:    ' + e.url)
	process.stdin.once('data', (data) => {
		console.log("输入了:" + data.toString().trim());
		botClient.submitSlider(data.toString().trim())
	})
});
botClient.on('system.login.qrcode', (e) => {
	console.log('扫码完成后回车继续:    ')
	process.stdin.once('data', () => {
		botClient.login()
	})
})
botClient.on('system.login.device', (e) => {
	console.log('请选择验证方式:(1：短信验证   其他：扫码验证)')
	process.stdin.once('data', (data) => {
		if (data.toString().trim() === '1') {
			botClient.sendSmsCode()
			console.log('请输入手机收到的短信验证码:')
			process.stdin.once('data', (res) => {
				botClient.submitSmsCode(res.toString().trim())
			})
		} else {
			console.log('扫码完成后回车继续：' + e.url)
			process.stdin.once('data', () => {
				botClient.login()
			})
		}
	})
})
botClient.login(qq,pw);

exports.bot = botClient;

// template plugins
require("./plugin/plugin-qinglong-bot") // 青龙bot
require("./plugin/plugin-qinglong-notify") // 青龙通知
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