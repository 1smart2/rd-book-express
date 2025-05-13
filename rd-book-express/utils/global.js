function validateParams(body, requiredFields) {
  const missingFields = [];
  console.log(1111,requiredFields);
  
  requiredFields.forEach((field) => {
    const value = body[field];
    if (
      value === undefined || // 检查值是否未定义
      value === "undefined" ||
      value === null || // 检查值是否为 null
      (typeof value === "string" && value.trim() === "") || // 检查字符串是否为空
      (Array.isArray(value) && value.length === 0) || // 检查数组是否为空
      (typeof value === "object" && Object.keys(value).length === 0) // 检查对象是否为空
    ) {
      missingFields.push(field);
    }
  });
  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `缺失关键参数${missingFields.join(",")}`,
    };
  }
  return { isValid: true };
}

module.exports = { validateParams };
