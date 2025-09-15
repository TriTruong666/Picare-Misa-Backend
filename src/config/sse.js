// sse.js
let clients = [];

const sseHandler = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // push vào danh sách client đang connect
  clients.push(res);

  // xoá khi client disconnect
  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
};

// Hàm gửi data tới tất cả client
const sendSse = (data) => {
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

module.exports = { sendSse, sseHandler };
