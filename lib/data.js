const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

// 基本路径（从当前位置链接到到数据存储文件夹的完整路径）
// __dirname 是个全局变量，表示当前所在位置
lib.baseDir = path.join(__dirname, '/../.data/')

// 新建文件并写入数据
lib.create = (dir, file, data, callback) => {
    // 打开文件('wx'：打开文件用于写入。如果文件不存在，则创建文件；如果文件已存在，抛出异常)
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // 将 JSON 数据转换为字符串
            const stringData = JSON.stringify(data);

            // 往文件中写入数据，并关闭文件
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    // 关闭文件（大多数操作系统会限制打开的文件描述符的数量，所以当操作完成时需关闭描述符。 如果不这样做会导致内存泄漏，最终造成应用奔溃）
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing to new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Could not create new file, it may already exist');
        }
    });
};

// 从文件中读取数据
lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (err, data) => {
        if (!err && data) {
            var parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }

    });
}

// update data inside a file
lib.update = (dir, file, data, callback) => {
    // 打开文件（'r+'： 打开文件用于读取和写入。如果文件不存在则抛出异常）
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // 将 JSON 数据转换为字符串
            const stringData = JSON.stringify(data);

            // truncate the file
            fs.truncate(`${lib.baseDir}${dir}/${file}.json`, (err) => {
                if (!err) {
                    // wirte to the file and close it
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing existing file');
                                }
                            })
                        } else {
                            callback('Error writing to existing file');
                        }
                    })
                } else {
                    callback('Error truncating file');
                }
            })
        } else {
            callback('Could not open the file for update, it may not exist yet');
        }
    })
}

// delete a file
lib.delete = (dir, file, callback) => {
    // unlink the file
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, (err) => {
        if (!err) {
            callback(false)
        } else {
            callback('Error deleting file');
        }
    })
}

module.exports = lib;
