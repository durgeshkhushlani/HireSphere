const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Signed direct upload: the browser uploads the PDF straight to Cloudinary
// using this signature — the file never passes through our server. A
// stable public_id per student (with overwrite) means re-uploading a new
// resume replaces the old asset instead of accumulating orphaned files.
function generateResumeUploadSignature(studentUserId) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_* env vars missing)');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `resumes/${studentUserId}`;
  const paramsToSign = { timestamp, public_id: publicId, overwrite: true };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    publicId,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}

module.exports = { generateResumeUploadSignature };
