// 环境容器
const environments = {};

// Staging  环境（默认）
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging'
};

// Production 环境
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production'
};

// 识别当前请求的环境
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// 检查是否有当前请求的环境的配置
const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

// 导出模块
module.exports = environmentToExport;
