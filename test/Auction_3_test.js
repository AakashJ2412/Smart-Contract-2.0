const Averageprice = artifacts.require("AveragePrice");
const { soliditySha3 } = require("web3-utils");

contract("Averageprice", (accounts) => {

  it("The end of the auction transfers the correct amount of money", async () => {
    const auctionItem = {
      item: "Shoes",
    };
    const bidValues = [100, 200, 300];
    const blindValues = [
      soliditySha3(bidValues[0]), 
      soliditySha3(bidValues[1]),
      soliditySha3(bidValues[2])
    ];

    let averageprice = await Averageprice.new(
      auctionItem.item,
      accounts[0],
      {from: accounts[0]}
    );

    await averageprice.bid(blindValues[0], accounts[1], {
      from: accounts[1], value: bidValues[0]
    }); 
    await averageprice.bid(blindValues[1], accounts[2], {
      from: accounts[2], value: bidValues[1]
    });

    await averageprice.bid(blindValues[2], accounts[3], {
      from: accounts[3], value: bidValues[2]
    });

    // Single bid is the winner of the auction. 
    await averageprice.reveal(bidValues[0], accounts[1]);
    await averageprice.reveal(bidValues[1], accounts[2]);
    await averageprice.reveal(bidValues[2], accounts[3]);


    const tx = await averageprice.auctionEnd({from: accounts[0]});
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "AuctionEnded");
    assert.equal(log.args.winner, accounts[2]);
    assert.equal(log.args.finalPrice, bidValues[1]);
  });
});

