const FirstPrice = artifacts.require("FirstPrice");

module.exports = function (deployer) {
    deployer.deploy(FirstPrice);
};