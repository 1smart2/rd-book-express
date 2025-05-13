// likeModel.js 优化版
const mongoose = require("../db/mongoose");

const firstScreenLikeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userSchema', // 关联用户模型
    required: true
  },
  likes: [{
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FirstScreen', // 关联作品模型
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// 添加索引提升查询性能
firstScreenLikeSchema.index({ "likes.createdAt": -1 });
firstScreenLikeSchema.index({ userId: 1 });
firstScreenLikeSchema.index({ "likes.workId": 1, "likes.createdAt": 1 });

const FirstScreenLike = mongoose.model("FirstScreenLike", firstScreenLikeSchema);
module.exports = FirstScreenLike;