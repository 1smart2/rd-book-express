// models/collectModel.js
const mongoose = require("mongoose");

const collectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // 改为 ObjectId
    ref: 'userSchema', // 关联用户模型
    required: true
  },
  collects: [{
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FirstScreen',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// 添加索引
collectSchema.index({ "collects.createdAt": -1 });
collectSchema.index({ userId: 1 }); // 用户ID索引

collectSchema.index({ "collects.workId": 1 });
collectSchema.index({ "collects.createdAt": -1 });
collectSchema.index({ "collects.workId": 1, "collects.createdAt": 1 });

const CollectModel = mongoose.model("Collect", collectSchema); // 修正模型名
module.exports = CollectModel;