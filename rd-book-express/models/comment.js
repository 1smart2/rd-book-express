// models/comment.js
const mongoose = require("../db/mongoose");

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userSchema',
        required: true
    },
    work: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FirstScreen',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    reports: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'userSchema',
            required: true
        },
        reason: {
            type: String,
            default: '其他'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    reportCount: {
        type: Number,
        default: 0
    },
    handledStatus: { // 新增处理状态字段
        type: String,
        enum: ['pending', 'resolved'],
        default: 'pending',
        required: function () { // 只在有举报时必填
            return this.reportCount > 0;
          }
    }
},
 {
    timestamps: true
});

commentSchema.index({ work: 1, createdAt: 1 });
commentSchema.index({ reportCount: -1 });
commentSchema.index({ 'reports.userId': 1 });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;