const mongoose = require("../db/mongoose");

const firstScreenSchema = new mongoose.Schema({
  imagesInfo: Array, // 图片路径和宽高
  title: String, // 标题
  tip: Array,
  content: String,
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userSchema',
    index: true // 添加索引
  }, // 作者id
  avatar: String, // 作者头像
  account: String, // 作者账号
  collectCount: {
    type: Number,
    default: 0,
  },
  likeCount: {
    type: Number,
    default: 0,
  }, // 计数
  createTime: Date,
  updateTime: Date,
  reports: [{ // 举报记录数组
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userSchema',
      required: true
    },
    reason: {
      type: String,
      required: true,
      maxlength: 200
    },
    reportTime: {
      type: Date,
      default: Date.now
    }
  }],
  reportCount: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: false // 默认未审核
  },
  isDraft: {
    type: Boolean,
    default: false,
    index: true // 添加索引
  },
});

// 在保存文档之前设置 createTime 和 updateTime
firstScreenSchema.pre("save", function (next) {
  if (!this.createTime) {
    this.createTime = new Date();
  }
  next();
});

firstScreenSchema.index({ authorId: 1, createTime: -1 });
const FirstScreen = mongoose.model("FirstScreen", firstScreenSchema);
firstScreenSchema.index({ account: 1 });
firstScreenSchema.index({ avatar: 1 }); 
firstScreenSchema.index({ authorId: 1 });

module.exports = FirstScreen;