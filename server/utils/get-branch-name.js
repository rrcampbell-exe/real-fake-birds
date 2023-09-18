const { execSync } = require('child_process');

const getBranchName = () => {
  return execSync('git rev-parse --abbrev-ref HEAD')
    .toString('utf8')
    .replace(/[\n\r\s]+$/, '');
}

module.exports = getBranchName
