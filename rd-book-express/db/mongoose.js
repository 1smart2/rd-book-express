const mongoose = require("mongoose");
//导入 配置文件
const { DBHOST, DBPORT, DBNAME } = require("../config/mongooseConfig");
mongoose.set("strictQuery", true);
//2，连接MongoDB数据库
console.log("jinlaile");
mongoose.connect(`mongodb://${DBHOST}:${DBPORT}/${DBNAME}`, {
  useNewUrlParser: true,
});
mongoose.connection.on("connected", function () {
  console.log("MongoDB connected success.");
});

mongoose.connection.on("error", function () {
  console.log("MongoDB connected fail.");
});

mongoose.connection.on("disconnected", function () {
  console.log("MongoDB connected disconnected.");
});
module.exports = mongoose;
