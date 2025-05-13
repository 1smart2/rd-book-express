// const kafka = require("./kafka");

// const producer = kafka.producer();

// const produceMessage = async (topic, message) => {
//   await producer.connect();
//   try {
//     await producer.send({
//       topic,
//       messages: [{ value: JSON.stringify(message) }],
//     });
//   } catch (error) {
//     console.error("Error producing message:", error);
//   } finally {
//     await producer.disconnect();
//   }
// };

// module.exports = produceMessage;
