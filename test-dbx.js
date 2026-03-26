const { Dropbox } = require('dropbox');
const fetchFn = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function run() {
  const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch: fetchFn });
  
  try {
    const dropPath = `/vault/shard_test_${Date.now()}.txt`;
    console.log('Uploading to', dropPath);
    const res = await dbx.filesUpload({ path: dropPath, contents: Buffer.from('test data') });
    console.log('Upload result ID:', res.result.id);
    
    // Attempt download using ID
    console.log('Downloading using ID:', res.result.id);
    const downByID = await dbx.filesDownload({ path: res.result.id });
    console.log('Download by ID Success!');
  } catch (e) {
    if (e.error) console.error('Error:', JSON.stringify(e.error));
    else console.error('Error:', e);
  }
}
run();
