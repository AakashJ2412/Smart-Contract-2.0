const Marketplace = artifacts.require("Marketplace");

contract("Marketplace", (accounts) => {
  let marketplace;

  const listingObj = {
    price: 10,
    itemName: "SixtyNine",
    itemDesc: "Smelly Cat smelly cat",
  };

  beforeEach(async () => {
    marketplace = await Marketplace.new({ from: accounts[0] });
  });

  afterEach(async () => {
    await marketplace.killMarketplace({ from: accounts[0] });
  });

  it("Checks if listing is created", async () => {
    const tx = await marketplace.createListing(
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.price,
      { from: accounts[0] }
    );

    // Fetch the listing and check the values
    const listings = await marketplace.fetchMarketItems();
    assert.equal(listingObj.price, listings[0].askingPrice);
    assert.equal(listingObj.itemName, listings[0].itemName);
    assert.equal(listingObj.itemDesc, listings[0].itemDesc);

    // Check if the correct event is emmited
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "ListingCreated");
    assert.equal(log.args.itemName.toString(), listingObj.itemName);
    assert.equal(log.args.listingID, 0);
    assert.equal(log.args.askingPrice, listingObj.price);
    assert.equal(log.args.uniqueSellerID, accounts[0]);
  });

  it("Checks if items are listed", async () => {
    for (let i = 0; i < 3; i++) {
      await marketplace.createListing(
        listingObj.itemName,
        listingObj.itemDesc,
        listingObj.price,
        { from: accounts[i] }
      );
    }

    let listings = await marketplace.fetchMarketItems();
    assert.equal(listings.length, 3);
    await marketplace.buyListing(0, "pubkey", {
      from: accounts[3],
      value: listingObj.price,
    });
    listings = await marketplace.fetchMarketItems();
    assert.equal(listings.length, 2);

    // Check if only the UNSOLD items are listed
    for (let i = 0; i < 2; i++) {
      assert.equal(listings[i].uniqueSellerID, accounts[i + 1]);
      for (let i = 0; i < 3; i++) {
        await marketplace.createListing(
          listingObj.itemName,
          listingObj.itemDesc,
          listingObj.price,
          { from: accounts[i] }
        );
      }
    }
  });

  it("Check if sold items are listed", async () => {
    for (let i = 0; i < 3; i++) {
      await marketplace.createListing(
        listingObj.itemName,
        listingObj.itemDesc,
        listingObj.price,
        { from: accounts[i] }
      );
    }

    let listings = await marketplace.fetchSoldItems({ from: accounts[0] });
    assert.equal(listings.length, 1);
    assert.equal(listings[0].uniqueSellerID, accounts[0]);
  });

  it("Check if bought items are listed", async () => {
    for (let i = 0; i < 3; i++) {
      await marketplace.createListing(
        listingObj.itemName,
        listingObj.itemDesc,
        listingObj.price,
        { from: accounts[i] }
      );
    }

    await marketplace.buyListing(0, "pubkey", {
      from: accounts[3],
      value: listingObj.price,
    });

    const listings = await marketplace.fetchBoughtItems({ from: accounts[3] });
    assert.equal(listings.length, 1);
    assert.equal(listings[0].uniqueSellerID, accounts[0]);
    assert.equal(listings[0].uniqueBuyerID, accounts[3]);
  });

  it("Checks if items are being bought", async () => {
    for (let i = 0; i < 3; i++) {
      await marketplace.createListing(
        listingObj.itemName,
        listingObj.itemDesc,
        listingObj.price,
        { from: accounts[i] }
      );
    }

    // Check if the correct event is being emmited
    const tx = await marketplace.buyListing(0, "pubkey", {
      from: accounts[3],
      value: listingObj.price,
    });
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "ListingSold");
    assert.equal(log.args.itemName.toString(), listingObj.itemName);
    assert.equal(log.args.listingID, 0);
    assert.equal(log.args.askingPrice, listingObj.price);
    assert.equal(log.args.uniqueSellerID, accounts[0]);
    assert.equal(log.args.uniqueBuyerID, accounts[3]);
    assert.equal(log.args.buyerPubKey, "pubkey");

    // Check if the contract balance increased
    assert.equal(
      await web3.eth.getBalance(marketplace.address),
      listingObj.price
    );
  });

  it("Checks if items are delivered", async () => {
    await marketplace.createListing(
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.price,
      { from: accounts[0] }
    );

    // Buy an item
    await marketplace.buyListing(0, "pubkey", {
      from: accounts[1],
      value: listingObj.price,
    });

    // Deliver listing
    const tx = await marketplace.deliverListing(0, "a", "b", "c", "d", {
      from: accounts[0],
    });

    // Check if the correct event is being emmited
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "ListingDelivered");
    assert.equal(log.args.listingID, 0);
    assert.equal(log.args.uniqueSellerID, accounts[0]);
    assert.equal(log.args.uniqueBuyerID, accounts[1]);
    assert.equal(log.args.item.iv, "a");
    assert.equal(log.args.item.ephemPublicKey, "b");
    assert.equal(log.args.item.ciphertext, "c");
    assert.equal(log.args.item.mac, "d");
  });

  it("Checks if items are confirmed", async () => {
    await marketplace.createListing(
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.price,
      { from: accounts[0] }
    );

    // Buy an item
    await marketplace.buyListing(0, "pubkey", {
      from: accounts[1],
      value: listingObj.price,
    });

    // Deliver listing
    await marketplace.deliverListing(0, "a", "b", "c", "d", {
      from: accounts[0],
    });

    // Confirm listing
    const tx = await marketplace.confirmListing(0, { from: accounts[1] });

    // Check if the correct event is being emmited
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "ListingConfirmed");
    assert.equal(log.args.itemName.toString(), listingObj.itemName);
    assert.equal(log.args.listingID, 0);
    assert.equal(log.args.askingPrice, listingObj.price);
    assert.equal(log.args.uniqueSellerID, accounts[0]);
    assert.equal(log.args.uniqueBuyerID, accounts[1]);

    // Check if money transfered from contract to seller
    assert.equal(await web3.eth.getBalance(marketplace.address), 0);
  });
});
