const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

// 辅助函数的容器
const helpers = {};

// SHA256 hash
helpers.hash = (str) => {
    if (typeof(str) === 'string' && str.length > 0) {
        return crypto
            .createHmac('sha256', config.hashingSecret)
            .update(str)
            .digest('hex');
    } else {
        return false;
    }
}

// 把 String 转换成 JSON 对象
helpers.parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
};

// 生成一个指定长度的随机字符串
helpers.createRandomString = (strLength) => {
    strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';
        let str = '';
        for (let i = 0; i < strLength; i++) {
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomCharacter;
        }
        return str;
    } else {
        return false
    }
}

// 通过 Twilio 发送信息
helpers.sendTwilioSms = (phone, msg, callback) => {
    // 校验传入的参数
    phone = typeof(phone) === 'string' && phone.trim()
        .length === 10 ? phone.trim() : false;
    msg = typeof(msg) === 'string' && msg.trim()
        .length > 0 && msg.trim()
        .length <= 1600 ? msg.trim() : false;

    if (phone && msg) {
        // 生成请求的荷载
        const payload = {
            From: config.twilio.fromPhone,
            To: '+1' + phone,
            Body: msg
        }

        // 生成荷载的字符串（非 JSON 字符串）
        const stringPayload = querystring.stringify(payload);

        // 生成请求的详情
        const requestDetails = {
            protocol: 'https:',
            hostname: 'api.twilio.com',
            method: 'POST',
            path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            auth: config.twilio.accountSid + ':' + config.twilio.authToken,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        }

        // 初始化请求对象
        const req = https.request(requestDetails, (res) => {
            const status = res.statusCode;
            if (status === 200 || status === 201) {
                callback(false);
            } else {
                callback('Status code returned was: ' + status);
            }
        });

        // 给请求对象绑定错误回调，防止进程跑出异常后退出
        req.on('error', (e) => {
            callback(e);
        });

        // 往请求对象写入字符串化的荷载
        req.write(stringPayload);

        // 结束请求
        req.end();

    } else {
        callback('Given parameters were missing or invalid');
    }
}

module.exports = helpers;
