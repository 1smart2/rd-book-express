const mongoose = require("../db/mongoose");

const userSchema = new mongoose.Schema({
  role: {
    type: Number,
    default: 0, // 0-普通用户 1-管理员
    enum: [0, 1] // 限制可选值
  },
  avatar: String, // 图片路径
  account: {
    type: String,
    unique: true, // 新增唯一约束
    required: true
  },
  password: String,
  age: Number,
  birthDay: String,
  gender: String,
  attention: {
    type: Array,
    default: [],
  }, //关注
  fans: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userSchema' // 确保与模型名称一致
    },
    timestamp: Date
  }], //粉丝
  likedAndCollect: Number, //获赞与收藏
  works: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FirstScreen' // 关联到现有作品模型
  }],
  privacySettings: {
    hideLikesCollections: { // 隐藏点赞收藏
      type: Boolean,
      default: false
    },
    hideFollowRelations: { // 隐藏关注粉丝
      type: Boolean,
      default: false
    }
  },
  canComment: { // 新增评论权限字段
    type: Boolean,
    default: true
  },
  migrationVersion: {
    type: Number,
    default: 1 // 初始版本设为1
  }
});
userSchema.index({ "privacySettings.hideLikesCollections": 1 });
userSchema.index({ "privacySettings.hideFollowRelations": 1 });
userSchema.index({ role: 1 }); // 加速管理员查询
// 可添加索引加速查询
userSchema.index({ account: 1 }, { unique: true });
const userCls = mongoose.model("userSchema", userSchema);

module.exports = userCls;
