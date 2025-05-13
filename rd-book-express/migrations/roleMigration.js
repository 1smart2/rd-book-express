const mongoose = require('mongoose');
const firstScreenSchema = require('../models/firstScreenModel');

const migrateApprovalStatus = async () => {
    // 复用现有数据库连接配置
    await mongoose.connect('mongodb://localhost:27017/rd-book-express-mongo', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    // 执行数据迁移
    const result = await firstScreenSchema.updateMany(
        {
            isApproved: { $exists: false } // 查找没有isApproved字段的文档
        },
        {
            $set: { isApproved: false } // 设置默认值
        }
    );

    console.log(`迁移完成，更新了 ${result.nModified} 条作品数据`);
    process.exit(0);
};

migrateApprovalStatus().catch(err => {
    console.error('迁移失败:', err);
    process.exit(1);
});