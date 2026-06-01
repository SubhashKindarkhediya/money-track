const https = require('https');
https.get('https://moneytrackflow.vercel.app/assets/index-FYH67_97.js', (res) => {
  let jsData = '';
  res.on('data', d => jsData += d);
  res.on('end', () => {
    const match = jsData.match(/http[s]?:\/\/[^\"']+\/api\/v1/);
    console.log('API URL:', match ? match[0] : 'not found');
  });
});
