const SecondAuction = artifacts.require("SecondAuction");

module.exports = function (deployer) {
  deployer.deploy(SecondAuction);
};
