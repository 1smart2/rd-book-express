// const kafka = require("./kafka");
// const wss = require("./websocketServer");
// const WebSocket = require("ws"); // 引入 WebSocket 类

// const consumer = kafka.consumer({ groupId: "notification-group" });

// const consumeMessages = async (topic) => {
//   await consumer.connect();
//   await consumer.subscribe({ topic, fromBeginning: true });

//   await consumer.run({
//     eachMessage: async ({ topic, partition, message }) => {
//       const value = JSON.parse(JSON.parse(message.value.toString()));
//       console.log("Received message:", value, value.bloggerId);

//       // 触发通知逻辑
//       await sendNotification(value.bloggerId, value.articleId, value.message);
//     },
//   });
// };

// const sendNotification = async (bloggerId, articleId, message) => {
//   wss.clients.forEach((client) => {
//     console.log(bloggerId, articleId, message);

//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify({ bloggerId, articleId, message }));
//     }
//   });
// };

// module.exports = consumeMessages;
