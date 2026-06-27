const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({ region: 'ap-south-1', credentials: { accessKeyId: 'AKIAWMM3Y3SXBRVCHDPU', secretAccessKey: '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' }});
s3.send(new ListBucketsCommand({})).then(r => console.log('SUCCESS:', JSON.stringify(r.Buckets))).catch(e => console.log('ERROR:', e.message));