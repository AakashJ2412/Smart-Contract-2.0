const FirstPrice = artifacts.require("FirstPrice");
const { soliditySha3 } = require("web3-utils");

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

contract("FirstPrice", (accounts) => {

  beforeEach(async () => { });

  afterEach(async () => {
    // await firstplace.killMarketplace({ from: accounts[0] });
    // Can't end due to time limits
  });

  it("Checks if the auction is being hosted", async () => {
    const auctionItem = {
      biddingTime: 3600,
      revealTime: 3600,
      item: "Shoes",
    };
    let firstprice = await FirstPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );
    const auction = await firstprice.fetchDetails();
    assert.equal(auctionItem.biddingTime, auction[1]);
    assert.equal(auctionItem.revealTime + auctionItem.biddingTime, auction[2]);
    assert.equal(auctionItem.item, auction.item);
  });

  it("Checks if the bidding is working", async () => {
    const auctionItem = {
      biddingTime: 3600,
      revealTime: 3600,
      item: "Shoes",
    };
    const bidValue = 100;
    const blindValue = soliditySha3(bidValue);

    let firstprice = await FirstPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    tx = await firstprice.bid(blindValue, { from: accounts[1] });

    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "BidMade");
    assert.equal(log.args.bidder, accounts[1]);
    assert.equal(log.args.blindedBid, blindValue);

    let returnBidValue = await firstprice.fetchBid({from: accounts[1]});
    assert.equal(blindValue, returnBidValue[0]);
    assert.equal(0, returnBidValue[1]);

    returnBidValue = await firstprice.fetchBidFromAddress(accounts[1],
      {from: accounts[0]});
    assert.equal(blindValue, returnBidValue[0]);
    assert.equal(0, returnBidValue[1]);
  });

  it("Checks if the reveal is correctly validating", async () => {
    const auctionItem = {
      biddingTime: 1,
      revealTime: 3600,
      item: "Shoes",
    };
    const bidValue = 100;
    const blindValue = soliditySha3(bidValue);

    let firstprice = await FirstPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await firstprice.bid(blindValue, 
      { from: accounts[1] });

    await sleep(3000);

    // Single bid is the winner of the auction. 
    const tx = await firstprice.reveal(bidValue, {from: accounts[1]});
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 2);

    let log = logs[0];
    assert.equal(log.event, "PlaceBidFirst");
    assert.equal(log.args.oldBidder, 0);
    assert.equal(log.args.oldValue, 0);
    assert.equal(log.args.doesReplace, true);

    log = logs[1];
    assert.equal(log.event, "RevealMade");
    assert.equal(log.args.bidder, accounts[1]);
    assert.equal(log.args.bidValue, bidValue);
    assert.equal(log.args.isCorrect, true);
  });

  it("Checks if the reveal doesn't refund for incorrect value", async () => {
    const auctionItem = {
      biddingTime: 2,
      revealTime: 3600,
      item: "Shoes",
    };
    const bidValue = 100;
    const blindValue = soliditySha3(bidValue);

    let firstprice = await FirstPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await firstprice.bid(blindValue, 
      { from: accounts[1] });

    await sleep(4000);

    // Single bid is the winner of the auction. 
    const tx = await firstprice.reveal(200, {from: accounts[1]});
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "RevealMade");
    assert.equal(log.args.bidder, accounts[1]);
    assert.equal(log.args.bidValue, 200);
    assert.equal(log.args.isCorrect, false);
  });

  it("Checks if the new bid will override the old bid", async () => {
    const auctionItem = {
      biddingTime: 2,
      revealTime: 3600,
      item: "Shoes",
    };
    const bidValues = [100, 200];
    const blindValues = [
      soliditySha3(bidValues[0]), 
      soliditySha3(bidValues[1])
    ];

    let firstprice = await FirstPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await firstprice.bid(blindValues[0], {
      from: accounts[1],
    });

    await firstprice.bid(blindValues[1], {
      from: accounts[2],
    });

    await sleep(4000);

    // Single bid is the winner of the auction. 
    await firstprice.reveal(bidValues[0], {from: accounts[1]});
    const tx = await firstprice.reveal(bidValues[1], {from: accounts[2]});

    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 2);

    let log = logs[0];
    assert.equal(log.event, "PlaceBidFirst");
    assert.equal(log.args.oldBidder, accounts[1]);
    assert.equal(log.args.oldValue, bidValues[0]);
    // 200 > 100 -> the value will be replaced.
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
      revealTime: 8,
      item: "Shoes",
    };
    const bidValues = [100, 200];
    const blindValues = [
      soliditySha3(bidValues[0]), 
      soliditySha3(bidValues[1])
    ];

    let firstprice = await FirstPrice.new(
      auctionItem.biddingTime,
      auctionItem.revealTime,
      auctionItem.item,
      {from: accounts[0]}
    );

    await firstprice.bid(blindValues[0], 
      { from: accounts[1] });

    await firstprice.bid(blindValues[1], 
      { from: accounts[2] });

    await sleep(4000);

    // Single bid is the winner of the auction. 
    await firstprice.reveal(bidValues[0], {from: accounts[1]});
    await firstprice.reveal(bidValues[1], {from: accounts[2]});

    await sleep(10000);

    const tx = await firstprice.auctionEnd({from: accounts[0]});
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "AuctionEnded");
    assert.equal(log.args.winner, accounts[2]);
    assert.equal(log.args.finalPrice, bidValues[1]);
  });
});
