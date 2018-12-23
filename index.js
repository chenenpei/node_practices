const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder')
    .StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handers');
const helpers = require('./lib/helpers');

// 初始化 http server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

//  启动 http server
httpServer.listen(config.httpPort, () => {
    console.log(`The server is listening on port: ${config.httpPort}`);
});

// 初始化 http server
const httpsServerOptions = {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

// 启动 https server
httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port: ${config.httpsPort}`);
});

// server 通用逻辑代码
function unifiedServer(req, res) {
    // 解析 url
    const parsedUrl = url.parse(req.url, true);

    // 获取路径
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // 获取路径中的 query 参数
    const queryStringObject = parsedUrl.query;

    // 获取 HTTP 方法
    const method = req.method.toLowerCase();

    // 获取请求头部
    const headers = req.headers;

    // 获取请求 payload
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();

        // 选择请求路由的 handler
        const chosenHandler = router[trimmedPath] ? router[trimmedPath] : handlers.notFound;

        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        chosenHandler(data, (statusCode, payload) => {
            // 设置默认状态码
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

            // 设置默认 payload
            payload = typeof(payload) === 'object' ? payload : {};

            const payloadString = JSON.stringify(payload);

            // 返回响应
            res.setHeader('Content-type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // 打印信息
            console.log('Returning this response', statusCode, payloadString);
        })
    });
}

// 定义请求路由
const router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
}
