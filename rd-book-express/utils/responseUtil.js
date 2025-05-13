// utils/responseUtils.js

/**
 * 成功响应
 * @param {Object} res - Express 响应对象
 * @param {string} message - 响应消息
 * @param {number} [statusCode=200] - HTTP 状态码
 * @param {number} [code=0] - 自定义状态码
 * @param {...Object} args - 额外的数据对象
 */
const successRes = (res, message, statusCode = 200, code = 0, data) => {
  
  return res.status(statusCode).json({
    message,
    data,
    status: "OK",
    code,
  });
};

/**
 * 失败响应
 * @param {Object} res - Express 响应对象
 * @param {string} message - 响应消息
 * @param {number} [statusCode=400] - HTTP 状态码
 * @param {number} [code=1] - 自定义状态码
 */
const failRes = (res, message, statusCode = 400, code = 40000) => {
  return res.status(statusCode).json({
    message,
    status: "ERROR",
    code,
  });
};

/**
 * 数组错误响应
 * @param {Object} res - Express 响应对象
 * @param {Object} error - 错误对象，通常来自验证库（如 Joi 或 Express-Validator）
 * @param {number} [statusCode=422] - HTTP 状态码
 * @param {number} [code=2] - 自定义状态码
 */
const arrayFailRes = (res, error, statusCode = 422, code = 2) => {
  return res.status(statusCode).json({
    message: error.array(),
    status: "ERROR",
    code,
  });
};

/**
 * 服务器错误响应
 * @param {Object} res - Express 响应对象
 * @param {string} message - 响应消息
 * @param {number} [statusCode=500] - HTTP 状态码
 * @param {number} [code=3] - 自定义状态码
 */
const errorRes = (res, message, statusCode = 500, code = 3) => {
  return res.status(statusCode).json({
    message,
    status: "ERROR",
    code,
  });
};

module.exports = {
  successRes,
  failRes,
  arrayFailRes,
  errorRes,
};
