"use strict"
const { bot } = require("../index")
const axios = require('axios');
const fs = require("fs");

// 1. 基础配置
const configFile = "plugin/plugin-qinglong-bot.json";
const config = JSON.parse(fs.readFileSync(configFile).toString()) || {};

const qinglongBaseURL = config.qinglong.baseURL; 			// 青龙url地址
const qinglongClientId = config.qinglong.clientId;			// 青龙clientId
const qinglongClientSecret = config.qinglong.clientSecret;	// 青龙clientSecret

const qqAdmin = Number(config.qq.admin);	// 管理员QQ号
const qqGroup = Number(config.qq.group); 	// 青龙消息处理群

// 2. 青龙http客户端封装
const qlHttp = axios.create({
	baseURL: qinglongBaseURL,
});
qlHttp.interceptors.request.use(async function (request) {
	const headers = request.headers;
	let token = '';
	if (!token) {
		token = await axios.get(qinglongBaseURL + '/open/auth/token', { params: { client_id: qinglongClientId, client_secret: qinglongClientSecret } })
			.then(response => response.data.data.token)
			.catch(error => console.log("获取青龙token异常" + error, true));
	}
	headers["Authorization"] = 'Bearer ' + token;
	return request;
}, function (error) {
	return Promise.reject(error);
});

// 3. 消息分发监听
bot.on("message.group", async function (msg) {
	// 3.1. 只处理QQ群消息
	if(msg.group_id !== parseInt(qqGroup)) {
		return;
	}

	// 3.2. 获取要发送的消息
	const messages = [];
	if (msg.raw_message === "青龙ck") {
		messages.push(...await handleCookieCheck(msg.user_id));
	}

	// 3.3. 发送消息
	for (let message of messages) {
		message = message.replace(/(\d{3})\d*(\d{4})/g, '$1****$2');
		await sleep(1000);
		msg.reply(message, true);
		console.log(message);
	}
})
bot.on("message.private", async function (msg) {
	const messages = [];
	if (msg.raw_message === "青龙ck") {
		messages.push(...await handleCookieCheck(msg.user_id));
	}
	else if (msg.raw_message.indexOf('青龙ck更新') === 0) {
		const qq = msg.user_id;
		const matchs = msg.raw_message.match(/.*【(.*)】【(.*)】/);
		const username = matchs[1];
		const ptPin = matchs[2].match(/pt_pin=.+?;/);
		const ptKey = matchs[2].match(/pt_key=.+?;/);
		messages.push(...await handleCookieUpdate(qq, username, ptPin, ptKey));
	}
	else {
		messages.push(`指令错误，请查看群公告获取最新的指令`, true);
	}

	for (let message of messages) {
		// message = message.replace(/(\d{3})\d*(\d{4})/g, '$1****$2');
		await sleep(1000);
		msg.reply(message, true);
		console.log(message);
	}
})

// 4. 定时任务
if (qqGroup) {
	const schedule = require('node-schedule');
	// 4.1. 每天0点提醒ck过期信息
	schedule.scheduleJob('0 0 0 * * ?', async () => {
		const messages = [...await handleCookieCheck(qqAdmin)];
		for (let message of messages) {
			message = message.replace(/(\d{3})\d*(\d{4})/g, '$1****$2');
			const group = bot.pickGroup(qqGroup, true);
			await sleep(1000);
			group.sendMsg(message);
		}
	});
}

async function handleCookieCheck(qq) {
	// 1. 获取cookie列表
	let envs = await getCookieEnvs(qq);

	// 2. 校验cookie
	const dayWarn = 25; // ck有效期一个月，这里提前预警
	const invalidRemarks = [], warnRemarks = [];
	for (let i = 0; i < envs.length; i++) {
		const env = envs[i];
		let remarks = (env.remarks || '');
		remarks = remarks.substring(remarks.indexOf(':') + 1);
		// 账号禁用校验
		if (env.status === 1) {
			invalidRemarks.push(remarks);
		}
		// 账号临期校验
		else if (env.status === 0 && new Date() - Date.parse(env.timestamp) > dayWarn * 24 * 60 * 60 * 1000) {
			warnRemarks.push(remarks);
		}
	}

	// 3. 发送消息
	const messages = [];
	if (invalidRemarks.length > 0) {
		messages.push(`${qq}的已失效cookie列表（用户名）: \n${invalidRemarks.join('\n')}`);
	}
	if (warnRemarks.length > 0) {
		messages.push(`${qq}的将过期cookie列表（用户名）: \n${warnRemarks.join('\n')}`);
	}
	if(messages.length === 0) {
		messages.push(`${qq}暂无ck过期`);
	}
	// replyMsg += '\n请通过以下步骤自行更新ck.\n' +
	// 	'1.加机器人好友，私聊发送“青龙ck”获取完整用户名，如：一则二十13333333333\n' +
	// 	'2.根据教程https://w37fhy.cn/2379.html 自己抓ck。\n' +
	// 	'3.私聊机器人，发送更新指令，格式为：青龙ck更新【用户名】【cookie串】'

	return messages;
}

async function handleCookieUpdate(qq, username, ptPin, ptKey) {
	if (!ptPin || !ptKey) {
		return [`ck解析失败`];
	}

	// 获取要修改的环境变量
	let envs = await getCookieEnvs(qq);
	envs = envs.filter(e => e.remarks === `${qq}:${username}`);
	if (envs.length <= 0) {
		return [`${username}的ck不存在，请联系管理员`];
	}
	if (envs.length > 1) {
		return [`${username}的ck存在多个，请联系管理员`];
	}
	const env = envs[0];

	// 启用并修改ck
	if (env.status === 1) {
		qlHttp.put('/open/envs/enable', [env._id])
			.catch(error => msg.reply("启用ck失败" + error, true));
	}
	qlHttp.put('/open/envs', { 'name': env.name, 'remarks': env.remarks, 'value': ptPin + ptKey, '_id': env._id })
		.catch(error => msg.reply("更新ck失败" + error, true));

	return [`更新ck成功，请输入【青龙ck】检查ck状态`];
}

async function getCookieEnvs(qq) {
	let envs = await qlHttp.get('/open/envs', { params: { searchValue: 'JD_COOKIE' } })
		.then(response => response.data.data)
		.catch(error => msg.reply("获取失效cookie列表异常" + error, true));

	// 如果不是admin用户查询, 就进行过滤
	if (qq !== qqAdmin) {
		envs = envs.filter(e => (e.remarks || '').indexOf(qq + ':') === 0);
	}
	return envs || [];
}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}