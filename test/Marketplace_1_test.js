const FirstAuction = artifacts.require("FirstAuction");

const { soliditySha3 } = require("web3-utils");

contract("FirstAuction", (accounts) => {
  let auctionplace;

  let listingObj = {
    itemName: "SixtyNine",
    itemDesc: "Smelly Cat smelly cat",
  };

  beforeEach(async () => {
    auctionplace = await FirstAuction.new({ from: accounts[0] });
  });

  afterEach(async () => {
    await auctionplace.killMarketplace({ from: accounts[0] });
  });

  it("Checks if fetchBoughtItems works correctly", async () => {
    for (let i = 0; i < 3; i++) {
      await auctionplace.createListing(
        listingObj.itemName,
        listingObj.itemDesc,
        { from: accounts[i] }
      );
    }

    const bidValue = 5;
    const blindValue = soliditySha3(bidValue);
    await auctionplace.bidListing(0, "pubkey", blindValue, {
      from: accounts[3],
      value: 10,
    });

    let listings = await auctionplace.fetchBoughtItems({ from: accounts[3] });

    assert.equal(listings.length, 1);
    assert.equal(listings[0].uniqueSellerID, accounts[0]);

    await auctionplace.endBiddingPhase(0, { from: accounts[0] });

    await auctionplace.revealListing(0, 5, { from: accounts[3] });

    await auctionplace.endRevealPhase(0, { from: accounts[0] });

    listings = await auctionplace.fetchBoughtItems({ from: accounts[3] });

    assert.equal(listings.length, 1);
    assert.equal(listings[0].uniqueSellerID, accounts[0]);
    assert.equal(listings[0].uniqueBuyerID, accounts[3]);
  });

  //   it("Checks if the reveal is working correctly", async () => {
  //     let auctionplace = await FirstAuction.new({ from: accounts[0] });
  //     await auctionplace.createListing(
  //       listingObj.itemName,
  //       listingObj.itemDesc,
  //       listingObj.biddingTime,
  //       listingObj.revealTime,
  //       { from: accounts[0] }
  //     );

  //     const bidValue = [10, 20];
  //     const blindValue = bidValue.map((x) => soliditySha3(x));
  //     await auctionplace.buyListing(0, blindValue[0], { from: accounts[1] });
  //     await auctionplace.buyListing(0, blindValue[1], { from: accounts[2] });
  //     await sleep(3000);
  //     await auctionplace.revealListing(0, bidValue[0], { from: accounts[1] });
  //     await auctionplace.revealListing(0, bidValue[0], { from: accounts[2] });
  //   });

  //   it("Checks if the winner is correct", async () => {
  //     listingObj = {
  //       ...listingObj,
  //       biddingTime: 2,
  //       revealTime: 3,
  //     };
  //     let auctionplace = await FirstAuction.new({ from: accounts[0] });
  //     await auctionplace.createListing(
  //       listingObj.itemName,
  //       listingObj.itemDesc,
  //       listingObj.biddingTime,
  //       listingObj.revealTime,
  //       { from: accounts[0] }
  //     );

  //     const bidValue = [10, 20];
  //     const blindValue = bidValue.map((x) => soliditySha3(x));
  //     await auctionplace.buyListing(0, blindValue[0], { from: accounts[1] });
  //     await auctionplace.buyListing(0, blindValue[1], { from: accounts[2] });
  //     await sleep(3000);
  //     await auctionplace.revealListing(0, bidValue[0], { from: accounts[1] });
  //     await auctionplace.revealListing(0, bidValue[1], { from: accounts[2] });
  //     await sleep(4000);
  //     await auctionplace.endListing(0, { from: accounts[0] });
  //   });
});
