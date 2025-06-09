const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

const serviceAccount = require('./service_account.json');

app.use(bodyParser.json());

app.post('/verify-key', async (req, res) => {
  const { licenseKey, deviceId } = req.body;

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1QQbJTdC2O68YExG1ECR4F4GKcRY9RBBZ34A3vKvoqDo'; // your sheet
  const range = 'Sheet1!A2:C1000';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows) return res.status(404).send({ message: 'No data found.' });

    for (let i = 0; i < rows.length; i++) {
      const [key, registeredDevice, activated] = rows[i];

      if (key.trim() === licenseKey.trim()) {
        if (activated?.toLowerCase() === 'no') {
          const updateRange = `Sheet1!B${i + 2}:C${i + 2}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: updateRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: [[deviceId, 'Yes']],
            },
          });

          return res.send({ status: 'activated' });
        } else if (registeredDevice === deviceId) {
          return res.send({ status: 'valid' });
        } else {
          return res.send({ status: 'used-on-other-device' });
        }
      }
    }

    res.send({ status: 'invalid' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error.' });
  }
});

app.listen(PORT, () => console.log(`License server running on port ${PORT}`));
