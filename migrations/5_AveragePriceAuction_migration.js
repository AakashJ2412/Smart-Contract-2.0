const AveragePrice = artifacts.require("AveragePrice");


module.exports = function (deployer) {
    deployer.deploy(AveragePrice);
};