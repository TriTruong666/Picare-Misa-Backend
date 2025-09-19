const axios = require("axios");

async function connectAmisMisa() {
  try {
    const body = {
      app_id: process.env.MISA_APP_ID,
      access_code: process.env.MISA_ACCESS_CODE,
      org_company_code: process.env.MISA_ORG_COMPANY_CODE,
    };
    const res = await axios.post(
      "https://actapp.misa.vn/api/oauth/actopen/connect",
      body,
      {
        headers: {
          "X-MISA-AccessToken": process.env.MISA_ACCESS_CODE,
        },
      }
    );
    return JSON.parse(res.data.Data);
  } catch (err) {
    console.error(`❌ Misa Error:`, err.message);
  }
}

async function postMisaDataService(accessToken, type = 2) {
  const body = {
    data_type: type,
    branch_id: null,
    skip: 0,
    take: 1000,
    app_id: process.env.MISA_APP_ID,
    last_sync_time: null,
  };
  try {
    const res = await axios.post(
      "https://actapp.misa.vn/apir/sync/actopen/get_dictionary",
      body,
      {
        headers: {
          "X-MISA-AccessToken": accessToken,
        },
      }
    );
    return JSON.parse(res.data.Data);
  } catch (err) {
    console.error(`❌ Misa Error:`, err.message);
  }
}

module.exports = { connectAmisMisa, postMisaDataService };
