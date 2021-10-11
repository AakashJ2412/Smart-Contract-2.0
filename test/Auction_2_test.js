const SecondPrice = artifacts.require("SecondPrice");
const { soliditySha3 } = require("web3-utils");

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

contract("SecondPrice", (accounts) => {

  it("Checks if the bid is correct and overrides 0", async () => {
    const auctionItem = {
      biddingTime: 2,
      revealTime: 3600,
      item: "Shoes",
    };
    const bidValues = [100];
    const blindValues = [ soliditySha3(bidValues[0]), ];

    let secondprice = await SecondPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await secondprice.bid(blindValues[0], 
      { from: accounts[1] });

    await sleep(3000);

    // Single bid is the winner of the auction. 
    const tx = await secondprice.reveal(bidValues[0], {from: accounts[1]});

    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 2);

    let log = logs[0];
    assert.equal(log.event, "PlaceBidSecond");
    assert.equal(log.args.oldBidder, 0);
    assert.equal(log.args.oldValue, 0);
    assert.equal(log.args.doesReplace, true);

    log = logs[1];
    assert.equal(log.event, "RevealMade");
    assert.equal(log.args.bidder, accounts[1]);
    assert.equal(log.args.bidValue, bidValues[0]);
    assert.equal(log.args.isCorrect, true);
  });

  it("Checks if the second prize will replace the bid", async () => {
    const auctionItem = {
      biddingTime: 2,
      revealTime: 3600,
      item: "Shoes",
    };
    const bidValues = [100, 200];
    const blindValues = [ soliditySha3(bidValues[0]), soliditySha3(bidValues[1])];

    let secondprice = await SecondPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await secondprice.bid(blindValues[0], 
      { from: accounts[1] });

    await secondprice.bid(blindValues[1], 
      { from: accounts[2] });

    await sleep(4000);

    // Single bid is the winner of the auction. 
    await secondprice.reveal(bidValues[0], {from: accounts[1]});
    const tx = await secondprice.reveal(bidValues[1], {from: accounts[2]});

    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 2);

    let log = logs[0];
    assert.equal(log.event, "PlaceBidSecond");
    assert.equal(log.args.oldBidder, accounts[1]);
    assert.equal(log.args.oldValue, bidValues[0]);
    assert.equal(log.args.doesReplace, true);

    log = logs[1];
    assert.equal(log.event, "RevealMade");
    assert.equal(log.args.bidder, accounts[2]);
    assert.equal(log.args.bidValue, bidValues[1]);
    assert.equal(log.args.isCorrect, true);
  });

  it("The end of the auction transfers the correct amount of money", async () => {
    const auctionItem = {
      biddingTime: 2,
      revealTime: 10,
      item: "Shoes",
    };
    const bidValues = [800, 200, 400];
    const blindValues = [
      soliditySha3(bidValues[0]), 
      soliditySha3(bidValues[1]),
      soliditySha3(bidValues[2])
    ];

    let secondprice = await SecondPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await secondprice.bid(blindValues[0], 
      { from: accounts[1] });

    await secondprice.bid(blindValues[1], 
      { from: accounts[2] });

    await secondprice.bid(blindValues[2], 
      { from: accounts[3] });

    await sleep(3000);

    await secondprice.reveal(bidValues[0], {from: accounts[1]});
    await secondprice.reveal(bidValues[1], {from: accounts[2]});
    await secondprice.reveal(bidValues[2], {from: accounts[3]});

    await sleep(10000);

    const tx = await secondprice.auctionEnd({from: accounts[0]});
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "AuctionEnded");
    assert.equal(log.args.winner, accounts[1]);
    assert.equal(log.args.finalPrice, bidValues[0]);
  });
});
