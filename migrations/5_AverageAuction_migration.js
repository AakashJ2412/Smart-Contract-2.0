const AverageAuction = artifacts.require("AverageAuction");

module.exports = function (deployer) {
  deployer.deploy(AverageAuction);
};
