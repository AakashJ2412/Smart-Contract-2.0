const SecondPrice = artifacts.require("SecondPrice");
const AveragePrice = artifacts.require("AveragePrice");


module.exports = function (deployer) {
    deployer.deploy(SecondPrice);
};