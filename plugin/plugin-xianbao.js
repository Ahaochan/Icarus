"use strict"
const {bot} = require("../index")
const fs = require("fs");

// 1. 基础配置
const configFile = "plugin/plugin-xianbao.json";
const getConfig = () => JSON.parse(fs.readFileSync(configFile).toString()) || {};

// 2. 监听群聊关键字
bot.on("message.group", function (msg) {
    const message = msg.raw_message;
    const config = getConfig();

    // 监听指定群聊
    if (!config.group.listen.includes(msg.group_id)) {
        return;
    }
    // 跳过黑名单
    if (message.includesAny(config.keyword.black)) {
        return;
    }
    // 遍历要转发的群聊
    for (const groupNumber of config.group.forward) {
        // 在白名单内就转发
        if (message.includesAny(config.keyword.white)) {
            const group = bot.pickGroup(parseInt(groupNumber), true);
            group.sendMsg(msg.message);
        }
    }
})

String.prototype.includesAny = function(array) {
    return array.filter(k => this.indexOf(k) > -1).length > 0;
}
