const FirstAuction = artifacts.require("FirstAuction");

module.exports = function (deployer) {
    deployer.deploy(FirstAuction);
};