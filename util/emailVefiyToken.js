const crypto = require('crypto');

const generateVerificationToken = () => {
  const token = crypto.randomBytes(20).toString('hex');
  return token;
};

module.exports =generateVerificationToken;