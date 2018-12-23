const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// 定义 handlers 对象
const handlers = {};

// Ping handler
handlers.ping = (data, callback) => {
    callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
};

// Users handler
handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.some(method => method === data.method)) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Users handler 的私有方法
handlers._users = {};

// User - post
// 必要参数：firstName, lastName, phone, password, tosAggrement
// 可选参数：none
handlers._users.post = (data, callback) => {
    // 检查必填参数
    const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim()
        .length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim()
        .length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim()
        .length === 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim()
        .length > 0 ? data.payload.password.trim() : false;
    const tosAggrement = typeof(data.payload.tosAggrement) === 'boolean' && !!data.payload.tosAggrement ? true : false;

    if (firstName && lastName && phone && password && tosAggrement) {
        // 检查用户是否存在
        _data.read('users', phone, (err, data) => {
            if (!err) {
                // 如果成功读取文件，说明文件已存在，即已存在该用户
                callback(400, {
                    Error: 'A user with that phone number already exists'
                });
            } else {
                // 对密码进行哈希操作
                const hashedPassword = helpers.hash(password);

                // 创建用户对象
                if (hashedPassword) {
                    const userObject = {
                        firstName,
                        lastName,
                        phone,
                        hashedPassword,
                        tosAggrement: true
                    };

                    // 储存用户
                    _data.create('users', phone, userObject, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {
                                Error: 'Could not create the new user'
                            })
                        }
                    });
                } else {
                    callback(500, {
                        Error: 'Could not hash the user\'s password'
                    });
                }
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required fields'
        });
    }
};

// User - get
// 必要参数：phone
// 可选参数：none
handlers._users.get = (data, callback) => {
    // 检查传入的参数是否有效
    const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim()
        .length === 10 ? data.queryStringObject.phone : false;
    if (phone) {

        // 从请求头部读取 token
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // 检查读取的 token 是否有效
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                // 读取用户信息
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        // 从读取的数据中删除哈希后的密码（敏感信息）
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, {
                    Error: 'Missing required token in header, or token is in valid'
                });
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
};

// User - put
// 必要参数：phone
// 可选参数：firstName, lastName, password（至少申明其中一项）
handlers._users.put = (data, callback) => {
    // 检查传入的必填参数是否有效
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim()
        .length === 10 ? data.payload.phone : false;

    // 检查传入的可选参数是否有效
    const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim()
        .length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim()
        .length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim()
        .length > 0 ? data.payload.password.trim() : false;

    if (phone) {
        if (firstName || lastName || password) {
            // 从请求头部读取 token
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

            // 检查读取的 token 是否有效
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
                    // 读取用户信息
                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            // 更新数据
                            if (firstName) userData.firstName = firstName;
                            if (lastName) userData.lastName = lastName;
                            if (password) userData.hashedPassword = helpers.hash(password);

                            // 写入数据
                            _data.update('users', phone, userData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, {
                                        Error: 'Could update the user'
                                    });
                                }
                            });
                        } else {
                            callback(400, {
                                Error: 'The specified user does not exists'
                            });
                        }
                    })
                } else {
                    callback(403, {
                        Error: 'Missing required token in header, or token is in valid'
                    });
                }
            })
        } else {
            callback(400, {
                Error: 'Missing field to update'
            });
        }
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
};

// User - delete
// 必要参数：phone
// 可选参数：none
handlers._users.delete = (data, callback) => {
    // 检查传入的参数是否有效
    const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim()
        .length === 10 ? data.queryStringObject.phone : false;
    if (phone) {
        // 从请求头部读取 token
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // 检查读取的 token 是否有效
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                // callback(200);

                                // 删除与该用户有关的 check 文件
                                const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                const checksToDelete = userChecks.length;
                                if (checksToDelete > 0) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;

                                    userChecks.forEach(id => {
                                        _data.delete('checks', id, (err) => {
                                            if (err) {
                                                deletionErrors = true
                                            } else {
                                                checksDeleted++;
                                                if (checksDeleted === checksToDelete) {
                                                    if (!deletionErrors) {
                                                        callback(200);
                                                    } else {
                                                        callback(500, {
                                                            Error: "Errors encounted while attempting to delete all user\'s checks. Some checks may not have been deleted from the system successfully "
                                                        })
                                                    }
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    callback(200);
                                }
                            } else {
                                callback(500, {
                                    Error: 'Could not delete the specified user'
                                });
                            }
                        })
                    } else {
                        callback(400, {
                            Error: 'Could not find the specified user'
                        });
                    }
                });
            } else {
                callback(403, {
                    Error: 'Missing required token in header, or token is in valid'
                });
            }
        });
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
};

// Tokens handler
handlers.tokens = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.some(method => method === data.method)) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Tokens handler 的私有方法
handlers._tokens = {};

// Tokens - post
// 必要参数：phone, password
// 可选参数：none
handlers._tokens.post = (data, callback) => {
    // 检查必填参数
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim()
        .length === 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim()
        .length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        // 根据传入的 phone 读取对应用户信息
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                // 对传入的密码进行哈希操作， 并与读取的用户数据中的哈希密码进行比较
                const hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // 如果密码匹配，生成 token，并设置 1 小时的时效性
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        phone,
                        id: tokenId,
                        expires,
                    };
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, 'Could not create the new token');
                        }
                    })
                } else {
                    callback(400, {
                        Error: 'Password did not match the specified user\'s stored password'
                    });
                }
            } else {
                callback(400, {
                    Error: 'Could not find the specified user'
                });
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
}

// Tokens - get
// 必要参数：id
// 可选参数：none
handlers._tokens.get = (data, callback) => {
    // 检查传入的参数是否有效
    const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim()
        .length === 20 ? data.queryStringObject.id : false;
    console.log(data.queryStringObject.id.trim()
        .length);
    if (id) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
}

// Tokens - put
// 必要参数：id, extend
// 可选参数：none
handlers._tokens.put = (data, callback) => {
    const id = typeof(data.payload.id) === 'string' && data.payload.id.trim()
        .length === 20 ? data.payload.id : false;
    const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;
    if (id && extend) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                // 检查 token 是否过期
                if (tokenData.expires > Date.now()) {
                    // 延长 1 小时时效
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // 存入更新后的 token
                    _data.update('tokens', id, tokenData, (err, ) => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, {
                                Error: 'Could not update the token\'s expiration'
                            });
                        }
                    })
                } else {
                    callback(400, {
                        Error: 'The token has already expired, and can not be exptended'
                    });
                }
            } else {
                callback(400, {
                    Error: 'Specified token does not exist'
                });
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required field(s) or field(s) are invalid'
        });
    }
}

// Tokens - delete
handlers._tokens.delete = (data, callback) => {
    // 检查传入的参数是否有效
    const id = typeof(data.payload.id) === 'string' && data.payload.id.trim()
        .length === 20 ? data.payload.id : false;
    if (id) {
        _data.read('tokens', id, (err, data) => {
            if (!err && data) {
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {
                            Error: 'Could not delete the specified token'
                        });
                    }
                })
            } else {
                callback(400, {
                    Error: 'Could not find the specified token'
                });
            }
        });
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
}

// 检查传入的 token 对当前用户是否仍然有效
handlers._tokens.verifyToken = (id, phone, callback) => {
    // 读取 token
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            // 检查 token 信息
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false)
        }
    })
}

// Checks handler
handlers.checks = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.some(method => method === data.method)) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Checks handler 的私有方法
handlers._checks = {};

// Checks - post
// 必填参数：protocol, url, method, successCodes, timeoutSeconds
// 可选参数：none
handlers._checks.post = (data, callback) => {
    // 检查传入的参数是否有效
    const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf((data.payload.protocol)) > -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' && data.payload.url.trim()
        .length > 0 ? data.payload.url : false;
    const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    console.log(protocol, url, method, successCodes, timeoutSeconds);
    if (protocol && url && method && successCodes && timeoutSeconds) {
        // 从头部获取 token
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // 根据 token 查找用户
        _data.read('tokens', token, (err, tokenData) => {
            if (!err && tokenData) {
                const userPhone = tokenData.phone;
                // 查找用户
                _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                        const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // 检查用户 checks 的数目是否达到上限
                        if (userChecks.length < config.maxChecks) {
                            // 生成随机 id
                            const checkId = helpers.createRandomString(20);
                            // 生成 check 对象
                            const checkObj = {
                                id: checkId,
                                userPhone: userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds
                            };
                            // 储存 check 对象
                            _data.create('checks', checkId, checkObj, (err) => {
                                if (!err) {
                                    // 将 check id 存储到用户数据中
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    // 更新用户数据
                                    _data.update('users', userPhone, userData, (err) => {
                                        if (!err) {
                                            callback(200, checkObj);
                                        } else {
                                            callback(500, {
                                                Error: 'Could not update the user with the new check'
                                            });
                                        }
                                    })
                                } else {
                                    callback(500, {
                                        Error: 'Could create the new check'
                                    });
                                }
                            });
                        } else {
                            callback(400, {
                                Error: `The user already has the maximum number of checks (${ config.maxChecks })`
                            });
                        }
                    } else {
                        callback(403);
                    }
                })
            } else {
                callback(403);
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required inputs, or inputs are invalid'
        });
    }
}

// Checks - get
// 必填参数：id
// 可选参数：none
handlers._checks.get = (data, callback) => {
    // 检查传入的参数是否有效
    const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim()
        .length === 20 ? data.queryStringObject.id : false;
    if (id) {
        // 读取 check 信息
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                // 从请求头部读取 token
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                // 检查读取的 token 是否有效
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        callback(200, checkData);
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
}


// Checks - put
// 必填参数：id
// 可选参数：protocol, url, method, successCodes, timeoutSeconds (至少申明其中一项)
handlers._checks.put = (data, callback) => {
    // 检查传入的必填参数是否有效
    const id = typeof(data.payload.id) === 'string' && data.payload.id.trim()
        .length === 20 ? data.payload.id : false;

    // 检查传入的可选参数是否有效
    const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf((data.payload.protocol)) > -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' && data.payload.url.trim()
        .length > 0 ? data.payload.url : false;
    const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (id) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            // 读取 check 信息
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    // 从请求头部读取 token
                    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                    // 检查读取的 token 是否有效
                    handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            // 更新 check
                            if (protocol) checkData.protocol = protocol;
                            if (url) checkData.url = url;
                            if (method) checkData.method = method;
                            if (successCodes) checkData.successCodes = successCodes;
                            if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

                            // 储存更新后的 check 信息
                            _data.update('checks', id, checkData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(400, {
                                        Error: 'Could not update the check'
                                    });
                                }
                            })
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400, {
                        Error: 'Check ID did not exist'
                    });
                }
            });
        } else {
            callback(400, {
                Error: 'Missing required field'
            });
        }
    } else {
        callback(400, {
            Error: 'Missing required field'
        });
    }
}

// Checks - delete
// 必填参数：id
// 可选参数：none
handlers._checks.delete = (data, callback) => {
    // 检查传入的参数是否有效
    const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim()
        .length === 20 ? data.queryStringObject.id : false;

    if (id) {
        // 读取 check 信息
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                // 从请求头部读取 token
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                // 检查读取的 token 是否有效
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // 删除对应的 check
                        _data.delete('checks', id, (err) => {
                            if (!err) {

                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // 从用户的 check 列表中删除对应的 check
                                        userData.checks = userChecks.filter(item => item !== id);
                                        _data.update('users', checkData.userPhone, userData, function(err) {
                                            if (!err) {
                                                callback(200);
                                            } else {
                                                callback(500, {
                                                    'Error': 'Could not update the user'
                                                });
                                            }
                                        });
                                    } else {
                                        callback(500, {
                                            Error: 'Could not find the user who created the check, so could not remove the check from the list of checks on their user object'
                                        });
                                    }
                                })
                            } else {
                                callback(500, {
                                    Error: 'Could not delete the check data'
                                });
                            }
                        })
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(400, {
                    Error: "The check ID specified could not be found"
                });
            }
        });
    } else {
        callback(400, {
            Error: "Missing valid id"
        });
    }
}


module.exports = handlers;
