const Marketplace = artifacts.require("Marketplace");

contract("Marketplace", (accounts) => {
  let marketplace;

  const listingObj = {
    price: 10,
    itemName: "SixtyNine",
    itemDesc: "Smelly Cat smelly cat",
    item: "hash",
  };

  beforeEach(async () => {
    marketplace = await Marketplace.new({ from: accounts[0] });
  });

  afterEach(async () => {
    await marketplace.killMarketplace({ from: accounts[0] });
  });

  it("Checks if listing is created", async () => {
    const tx = await marketplace.createListing(
      listingObj.price,
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.item,
      { from: accounts[0] }
    );

    // Fetch the listing and check the values
    const listings = await marketplace.fetchMarketItems();
    assert.equal(listingObj.price, listings[0].askingPrice);
    assert.equal(listingObj.itemName, listings[0].itemName);
    assert.equal(listingObj.itemDesc, listings[0].itemDesc);
    assert.equal(listings[0].item, "");

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
        listingObj.price,
        listingObj.itemName,
        listingObj.itemDesc,
        listingObj.item,
        { from: accounts[i] }
      );
    }

    let listings = await marketplace.fetchMarketItems();
    assert.equal(listings.length, 3);
    await marketplace.buyListing(0, { from: accounts[3] });
    listings = await marketplace.fetchMarketItems();
    assert.equal(listings.length, 2);

    // Check if only the UNSOLD items are listed
    for (let i = 0; i < 2; i++) {
      assert.equal(listings[i].uniqueSellerID, accounts[i + 1]);
    }
  });

  it("Checks if items are being bought", async () => {
    for (let i = 0; i < 3; i++) {
      await marketplace.createListing(
        listingObj.price,
        listingObj.itemName,
        listingObj.itemDesc,
        listingObj.item + i,
        { from: accounts[i] }
      );
    }

    // Check if buying returns the hashed password (item)
    const boughtItem = await marketplace.buyListing.call(0, {
      from: accounts[3],
    });
    assert.equal(boughtItem, listingObj.item + 0);

    // Check if the correct event is being emmited
    const tx = await marketplace.buyListing(1, { from: accounts[4] });
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "ListingSold");
    assert.equal(log.args.itemName.toString(), listingObj.itemName);
    assert.equal(log.args.listingID, 1);
    assert.equal(log.args.askingPrice, listingObj.price);
    assert.equal(log.args.uniqueSellerID, accounts[1]);
    assert.equal(log.args.uniqueBuyerID, accounts[4]);
  });

  it("Checks if bought items aren't collected by wrong address", async () => {
    await marketplace.createListing(
      listingObj.price,
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.item,
      { from: accounts[0] }
    );

    await marketplace.buyListing(0, { from: accounts[1] });

    try {
      await marketplace.confirmListing(0, {
        from: accounts[2],
        value: listingObj.price,
      });
      throw error;
    } catch (error) {
      assert(error, "Expected an error but did not get one");
      assert(
        error.message.startsWith(
          "Returned error: VM Exception while processing transaction: revert Can't confirm"
        ),
        "Expected an error 'Can't confirm' but got '" +
          error.message +
          "' instead"
      );
    }
  });

  it("Checks if listings are paid with incorrect amount", async () => {
    await marketplace.createListing(
      listingObj.price,
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.item,
      { from: accounts[0] }
    );

    await marketplace.buyListing(0, { from: accounts[1] });

    try {
      await marketplace.confirmListing(0, {
        from: accounts[1],
        value: listingObj.price - 1,
      });
      throw error;
    } catch (error) {
      assert(error, "Expected an error but did not get one");
      assert(
        error.message.startsWith(
          "Returned error: VM Exception while processing transaction: revert Failed to transfer"
        ),
        "Expected an error 'Failed to transfer' but got '" +
          error.message +
          "' instead"
      );
    }
  });

  it("Checks if listings are delivered with correct amount", async () => {
    await marketplace.createListing(
      listingObj.price,
      listingObj.itemName,
      listingObj.itemDesc,
      listingObj.item,
      { from: accounts[0] }
    );

    await marketplace.buyListing(0, { from: accounts[1] });

    const tx = await marketplace.confirmListing(0, {
      from: accounts[1],
      value: listingObj.price,
    });

    // Check if the correct event is emmited
    const { logs } = tx;
    assert.ok(Array.isArray(logs));
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.event, "ListingDelivered");
    assert.equal(log.args.itemName.toString(), listingObj.itemName);
    assert.equal(log.args.listingID, 0);
    assert.equal(log.args.askingPrice, listingObj.price);
    assert.equal(log.args.uniqueSellerID, accounts[0]);
    assert.equal(log.args.uniqueBuyerID, accounts[1]);
  });
});
