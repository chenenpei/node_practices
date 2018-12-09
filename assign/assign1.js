const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder')
    .StringDecoder;

// define handlers
const handlers = {};

// Ping handler
handlers.ping = (data, callback) => {
    callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
};

// hello handler
handlers.hello = (data, callback) => {
    const payload = {
        greeting: 'Hi, this is Enpei Chen. Nice to meet you!'
    };
    callback(200, payload);
}

// define request router
const router = {
    ping: handlers.ping,
    hello: handlers.hello
};


// init http server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

//  start http server
httpServer.listen(800, () => {
    console.log('The server is listening on port: 800');
});

// general logical function for servers
function unifiedServer(req, res) {
    // pase url
    const parsedUrl = url.parse(req.url, true);

    // get path and trim it
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // get query
    const queryStringObject = parsedUrl.query;

    // get method
    const method = req.method.toLowerCase();

    // get headers
    const headers = req.headers;

    // get payload
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    // add data eventListner
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    // add end eventListner
    req.on('end', () => {
        buffer += decoder.end();

        // choose handler
        const chosenHandler = router[trimmedPath] ? router[trimmedPath] : handlers.notFound;

        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: buffer
        };

        chosenHandler(data, (statusCode, payload) => {
            // set default status code as 200 if it is not passed in
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

            // set default payload if it is not passed in
            payload = typeof(payload) === 'object' ? payload : {};
            const payloadString = JSON.stringify(payload);

            // send response
            res.setHeader('Content-type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // log response
            console.log('Returning this response', statusCode, payloadString);
        })
    });
}
