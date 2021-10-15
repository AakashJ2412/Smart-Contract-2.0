const FirstPrice = artifacts.require("FirstPrice");
const { soliditySha3 } = require("web3-utils");

contract("FirstPrice", (accounts) => {
  beforeEach(async () => {});

  afterEach(async () => {
    // await firstplace.killMarketplace({ from: accounts[0] });
    // Can't end due to time limits
  });

  it("Checks if the auction is being hosted", async () => {
    const auctionItem = {
      item: "Shoes",
    };
    let firstprice = await FirstPrice.new(accounts[0], auctionItem.item, {
      from: accounts[0],
    });
    const auction = await firstprice.fetchDetails();
    assert.equal(auction.item, auctionItem.item);
    assert.equal(auction.beneficiary, accounts[0]);
  });

  it("Checks if the bidding is working", async () => {
    const auctionItem = {
      item: "Shoes",
    };
    const bidValue = 100;
    const blindValue = soliditySha3(bidValue);

    let firstprice = await FirstPrice.new(accounts[0], auctionItem.item, {
      from: accounts[0],
    });

    tx = await firstprice.bid(blindValue, accounts[1], "pubkey", {
      from: accounts[1],
      value: bidValue,
    });

    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "BidMade");
    assert.equal(log.args.bidder, accounts[1]);
    assert.equal(log.args.blindedBid, blindValue);
    assert.equal(log.args.deposit, bidValue);

    const returnBidValue = await firstprice.fetchBidFromAddress(accounts[1], {
      from: accounts[1],
    });
    assert.equal(blindValue, returnBidValue.blindedBid);
    assert.equal(0, returnBidValue.reveal);
  });

  it("Checks if the reveal is correctly validating", async () => {
    const auctionItem = {
      item: "Shoes",
    };
    const bidValue = 100;
    const blindValue = soliditySha3(bidValue);

    let firstprice = await FirstPrice.new(accounts[0], auctionItem.item, {
      from: accounts[0],
    });

    await firstprice.bid(blindValue, accounts[1], "pubkey", {
      from: accounts[1],
      value: bidValue,
    });

    // Single bid is the winner of the auction.
    const tx = await firstprice.reveal(bidValue, accounts[1], {
      from: accounts[1],
    });
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);

    let log = logs[0];
    assert.equal(log.event, "RevealMade");
    assert.equal(log.args.bidder, accounts[1]);
    assert.equal(log.args.bidValue, bidValue);
    assert.equal(log.args.isCorrect, true);
  });

  it("The end of the auction transfers the correct amount of money", async () => {
    const auctionItem = {
      item: "Shoes",
    };
    const bidValues = [100, 200];
    const blindValues = [
      soliditySha3(bidValues[0]),
      soliditySha3(bidValues[1]),
    ];

    let firstprice = await FirstPrice.new(accounts[0], auctionItem.item, {
      from: accounts[0],
    });

    await firstprice.bid(blindValues[0], accounts[1], "pubkey", {
      from: accounts[1],
      value: bidValues[0],
    });
    // await firstprice.bid(blindValues[1], accounts[2], "pubkey", {
    //   from: accounts[2],
    //   value: bidValues[1],
    // });

    // Single bid is the winner of the auction.
    await firstprice.reveal(bidValues[0], accounts[1]);
    // await firstprice.reveal(bidValues[1], accounts[2]);

    const tx = await firstprice.auctionEnd({ from: accounts[0] });
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "AuctionEnded");
    assert.equal(log.args.winner, accounts[2]);
    assert.equal(log.args.finalPrice, bidValues[1]);
  });
});
