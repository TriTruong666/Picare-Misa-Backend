const axios = require("axios");
const crypto = require("crypto");

async function digestPost(path, body, username, password) {
  const url = `${path}`;

  const res1 = await axios.post(url, body, { validateStatus: () => true });
  const wwwAuth = res1.headers["www-authenticate"];
  if (!wwwAuth) throw new Error("Không nhận được header WWW-Authenticate");

  const authParams = {};
  wwwAuth.replace(
    /(\w+)="?([^",\s]+)"?/g,
    (_, key, val) => (authParams[key] = val)
  );

  const realm = authParams.realm;
  const nonce = authParams.nonce;
  const qop = authParams.qop;
  const uri = path;
  const nc = "00000001";
  const cnonce = crypto.randomBytes(8).toString("hex");

  const ha1 = crypto
    .createHash("md5")
    .update(`${username}:${realm}:${password}`)
    .digest("hex");
  const ha2 = crypto.createHash("md5").update(`POST:${uri}`).digest("hex");
  const response = crypto
    .createHash("md5")
    .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    .digest("hex");

  const authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;

  const res2 = await axios.post(url, body, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  return res2.data;
}

async function getAllAttendanceLogs(username, password, url, type) {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    function toISOStringWithTZ(date) {
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const mi = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+07:00`;
    }

    const startTime = toISOStringWithTZ(start);
    const endTime = toISOStringWithTZ(end);
    const maxResults = 30; // thử 30 hoặc 1000, tùy model hỗ trợ
    let allLogs = [];

    const firstResponse = await digestPost(
      `${url}/ISAPI/AccessControl/AcsEvent?format=json`,
      {
        AcsEventCond: {
          searchID: `search_${Date.now()}`,
          searchResultPosition: 0,
          maxResults: maxResults,
          major: 0,
          minor: type,
          startTime,
          endTime,
        },
      },
      username,
      password
    );

    const firstLogs = firstResponse?.AcsEvent?.InfoList || [];
    const totalMatches = firstResponse?.AcsEvent?.totalMatches || 0;
    const totalPages = Math.ceil(totalMatches / maxResults);

    allLogs = allLogs.concat(firstLogs);

    // 🔹 Lặp qua các trang còn lại
    for (let page = 2; page <= totalPages; page++) {
      const offset = (page - 1) * maxResults;
      const data = await digestPost(
        `${url}/ISAPI/AccessControl/AcsEvent?format=json`,
        {
          AcsEventCond: {
            searchID: `search_${Date.now()}`,
            searchResultPosition: offset,
            maxResults: maxResults,
            major: 0,
            minor: 75,
            startTime,
            endTime,
          },
        },
        username,
        password
      );

      const logs = data?.AcsEvent?.InfoList || [];
      allLogs = allLogs.concat(logs);

      // Nếu trả ít hơn maxResults thì dừng luôn (nhiều thiết bị không đủ log)
      if (logs.length < maxResults) {
        break;
      }
    }

    console.log(`Tổng log chấm công: ${allLogs.length}`);
    return allLogs;
  } catch (err) {
    console.error("❌ Error fetching attendance logs:", err);
    throw err;
  }
}

module.exports = { getAllAttendanceLogs };
