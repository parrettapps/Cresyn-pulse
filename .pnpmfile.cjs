// Allow native builds for security-critical and essential packages
function readPackage(pkg) {
  return pkg;
}
module.exports = { hooks: { readPackage } };
