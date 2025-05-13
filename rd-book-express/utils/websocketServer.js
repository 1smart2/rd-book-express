const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 9998 });

wss.on("connection", (ws) => {
  console.log("ws开启");

  ws.on("close", () => {
    console.log("ws关闭");
  });
});

module.exports = wss;
