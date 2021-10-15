// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;


// @title Marketplace for selling items
// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
// @notice View, sell, and buy items
// @dev It is assumed that the seller will deliver after getting paid
contract Marketplace {
    // @dev Possible states that a Listing can take
    enum State { UNSOLD, SOLD, PENDING, DELIVERED }

    // @dev Stores the encrypted password
    struct Encrypted {
      string iv;
      string ephemPublicKey;
      string ciphertext;
      string mac;
    }

    // @dev Stores the details of a listing
    struct Listing {
        uint listingID;
        string itemName;
        string itemDesc;
        uint256 askingPrice;
        address payable uniqueSellerID;
        address uniqueBuyerID;
        Encrypted item;
        string buyerPubKey;
        State state;
    }

    address payable public owner;
    uint private itemCount = 0;
    uint public itemSold = 0;

    // @dev mapping for all the Listing
    mapping(uint256 => Listing) private listings;

    // @notice Triggered to store the details of a listing on transaction logs
    // @param listingID Unique Id for the listing
    // @param itemName Name of the item
    // @param askingPrice Price set by the seller
    // @param uniqueSellerID The seller ID
    event ListingCreated (
        uint indexed listingID,
        string itemName,
        uint askingPrice,
        address uniqueSellerID
    );

    // @notice Triggered to store the details of the sold listing on transaction logs
    // @param listingID Unique Id for the listing
    // @param itemName Name of the item
    // @param askingPrice Price set by the seller
    // @param uniqueSellerID The seller ID
    // @param uniqueBuyerID The buyer ID
    // @param buyerPubKey The public key of the buyer to encrypt the item with
    event ListingSold (
        uint listingID,
        string itemName,
        uint askingPrice,
        address indexed uniqueSellerID,
        address uniqueBuyerID,
        string buyerPubKey
    );

    // @notice Triggered to store the details of the delivery of a listing on transaction logs
    // @dev Must not store the item itself for privacy
    // @param listingID Unique Id for the listing
    // @param uniqueSellerID The seller ID
    // @param uniqueBuyerID The buyer ID
    // @param item The encrypted password
    event ListingDelivered (
        uint listingID,
        Encrypted item,
        address uniqueSellerID,
        address uniqueBuyerID

    );

    // @notice Triggered to store the details of the confirmation of a listing on transaction logs
    // @dev Must not store the item itself for privacy
    // @param listingID Unique Id for the listing
    // @param itemName Name of the item
    // @param askingPrice Price set by the seller
    // @param uniqueSellerID The public key for the transaction
    // @param uniqueBuyerID The public key for the transaction
    event ListingConfirmed (
        uint listingID,
        string itemName,
        uint askingPrice,
        address uniqueSellerID,
        address uniqueBuyerID

    );

    // @notice Constructor to define the marketplace owner
    constructor() public {
        owner = msg.sender;
    }

    // @notice Function to add listing to the Marketplace
    // @dev Triggers the event for logging
    // @param price Price set by the seller
    // @param itemName Name of the item
    // @param itemDesc Description of the item set by seller
    function createListing(
        string memory itemName,
        string memory itemDesc,
        uint256 price
    ) public payable {
        require(price > 0, "Price must be atleast 1 wei");

        listings[itemCount] = Listing(
            itemCount,
            itemName,
            itemDesc,
            price,
            msg.sender,
            address(0),
            Encrypted("", "", "", ""),
            "",
            State.UNSOLD
        );

        emit ListingCreated(
            itemCount,
            itemName,
            price,
            msg.sender
        );
        itemCount += 1;
    }


    // @notice Function to print all the active listings
    // @return Listing The list of all active listings
    function fetchMarketItems() public view returns (Listing[] memory) {
        uint unsoldItemCount = itemCount - itemSold;
        uint currentIndex = 0;

        Listing[] memory items = new Listing[](unsoldItemCount);
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].state == State.UNSOLD) {
                Listing memory currentItem = listings[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    // @notice Function to print all listings put on sale by an user
    // @return Listing The list of all listings sold by an user
    function fetchSoldItems() public view returns (Listing[] memory) {
        uint cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].uniqueSellerID == msg.sender) {
                cnt += 1;
            }
        }

        Listing[] memory items = new Listing[](cnt);
        cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].uniqueSellerID == msg.sender) {
                Listing memory currentItem = listings[i];
                items[cnt] = currentItem;
                cnt += 1;
            }
        }
        return items;

    }

    // @notice Function to print all listings bought by an user
    // @return Listing The list of all listings bought by an user
    function fetchBoughtItems() public view returns (Listing[] memory) {
        uint cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].uniqueBuyerID == msg.sender) {
                cnt += 1;
            }
        }

        Listing[] memory items = new Listing[](cnt);
        cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].uniqueBuyerID == msg.sender) {
                Listing memory currentItem = listings[i];
                items[cnt] = currentItem;
                cnt += 1;
            }
        }
        return items;
    }


    // @notice Function to buy a listing and accepts the money to store in the contract
    // @dev Triggers the event for logging
    // @param itemId The item the buyer wants to buy
    function buyListing(uint itemId, string calldata buyerPubKey) external payable {
        require(msg.value >= listings[itemId].askingPrice, "Insufficient funds transfered");
        require(listings[itemId].state == State.UNSOLD, "Listing not in UNSOLD state");

        listings[itemId].uniqueBuyerID = msg.sender;
        listings[itemId].state = State.SOLD;
        listings[itemId].buyerPubKey = buyerPubKey;
        itemSold += 1;

        emit ListingSold(
            listings[itemId].listingID,
            listings[itemId].itemName,
            listings[itemId].askingPrice,
            listings[itemId].uniqueSellerID,
            msg.sender,
            buyerPubKey
        );

    }

    // @notice Called by the seller to store the password in encrypted form
    // @dev item password is encrypted
    // @param itemId Unique Id for the listing
    // @param iv Initialization vector for the password's encryption
    // @param ephemPublicKey Seller's ephemeral public key
    // @param ciphertext Encrypted password string
    // @param mac Checksum to maintain integrity of the message
    function deliverListing(
      uint itemId,
      string calldata iv,
      string calldata ephemPublicKey,
      string calldata ciphertext,
      string calldata mac
    ) external {
        require(msg.sender == listings[itemId].uniqueSellerID, "Only seller can deliver");
        require(listings[itemId].state == State.SOLD, "Listing not in SOLD state");
        listings[itemId].item = Encrypted(
            iv,
            ephemPublicKey,
            ciphertext,
            mac
        );
        listings[itemId].state = State.PENDING;

        emit ListingDelivered(
            listings[itemId].listingID,
            listings[itemId].item,
            msg.sender,
            listings[itemId].uniqueBuyerID
        );
    }

    // @notice Function to confirm a listing and transfer money to the seller
    // @dev Triggers the event for logging
    // @param itemId The item the buyer wants to confirm
    function confirmListing(uint itemId) external {
        require(listings[itemId].uniqueBuyerID == msg.sender, "Only buyer can confirm");
        require(listings[itemId].state == State.PENDING, "Listing not in PENDING state");
        listings[itemId].state = State.DELIVERED;

        // Transfer ether to seller
        listings[itemId].uniqueSellerID.transfer(listings[itemId].askingPrice);

        emit ListingConfirmed(
            listings[itemId].listingID,
            listings[itemId].itemName,
            listings[itemId].askingPrice,
            listings[itemId].uniqueSellerID,
            msg.sender
        );
    }

    // @notice Function that clears the marketplace
    // @dev Useful for testing
    function killMarketplace() external {
        require(msg.sender == owner, "Only the owner can kill the marketplace");
        selfdestruct(owner);
    }
}
