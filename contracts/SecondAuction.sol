// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import { SecondPrice } from "./Auction.sol";

/// @title Marketplace for selling items
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice View, sell, and buy items
/// @dev It is assumed that the seller will deliver after getting paid
contract SecondAuction {
    /// @dev Possible states that a Listing can take
    enum State { BIDDING, REVEAL, SOLD, PENDING, DELIVERED }

    /// @dev Stores the encrypted password
    struct Encrypted {
        bytes32 iv;
        string ephemPublicKey;
        bytes32 ciphertext;
        string mac;
    }

    /// @dev Stores the details of a listing
    struct Listing {
        uint listingID;
        string itemName;
        string itemDesc;
        address payable uniqueSellerID;
        address uniqueBuyerID;
        Encrypted item;
        State state;
        SecondPrice auction;
    }

    address payable public owner;
    uint private itemCount = 0;
    uint public itemBid = 0;

    /// @dev mapping for all the Listing
    mapping(uint256 => Listing) private listings;

    /// @notice Triggered to store the details of a listing on transaction logs
    /// @param listingID Unique Id for the listing
    /// @param itemName Name of the item
    /// @param listingID Unique Id for the listing
    /// @param uniqueSellerID The seller ID
    event ListingCreated (
        uint indexed listingID,
        string itemName,
        address uniqueSellerID
    );

    /// @notice Triggered when someone bids on a listing
    /// @param listingID Unique Id for the listing
    /// @param bidderAddress Unique Id for the bidder
    /// @param value Amount of currency transferred
    /// @param blindBid The hashed bid
    event ListingBid (
        uint indexed listingID,
        address bidderAddress,
        uint256 value,
        bytes32 blindBid,
        string bidderPubKey
    );

    /// @notice Triggered when someone reveals their bid
    /// @param listingID Unique Id for the listing
    /// @param bidderAddress Unique Id for the bidder
    /// @param value The actual bid made
    /// @param successful Was the revealed value valid
    event ListingReveal (
        uint indexed listingID,
        address bidderAddress,
        uint256 value,
        bool successful
    );

    /// @notice Triggered to store the details of the sold listing on transaction logs
    /// @param listingID Unique Id for the listing
    /// @param itemName Name of the item
    /// @param askingPrice Price set by the seller
    /// @param uniqueSellerID The seller ID
    /// @param uniqueBuyerID The buyer ID
    event ListingSold (
        uint listingID,
        address indexed uniqueSellerID,
        address uniqueBuyerID
    );

    /// @notice Triggered to store the details of the delivery of a listing on transaction logs
    /// @dev Must not store the item itself for privacy
    /// @param listingID Unique Id for the listing
    /// @param uniqueSellerID The seller ID
    /// @param uniqueBuyerID The buyer ID
    /// @param item The encrypted password
    event ListingDelivered (
        uint listingID,
        Encrypted item,
        address uniqueSellerID,
        address uniqueBuyerID

    );

    /// @notice Triggered to store the details of the confirmation of a listing on transaction logs
    /// @dev Must not store the item itself for privacy
    /// @param listingID Unique Id for the listing
    /// @param itemName Name of the item
    /// @param askingPrice Price set by the seller
    /// @param uniqueSellerID The public key for the transaction
    /// @param uniqueBuyerID The public key for the transaction
    event ListingConfirmed (
        uint listingID,
        string itemName,
        address uniqueSellerID,
        address uniqueBuyerID

    );

    /// @notice Constructor to define the marketplace owner
    constructor() public {
        owner = msg.sender;
    }

    /// @notice Function to add listing to the Marketplace
    /// @dev Triggers the event for logging
    /// @param price Price set by the seller
    /// @param itemName Name of the item
    /// @param itemDesc Description of the item set by seller
    function createListing(
        string memory itemName,
        string memory itemDesc
    ) public payable {
        listings[itemCount] = Listing(
            itemCount,
            itemName,
            itemDesc,
            msg.sender,
            address(0),
            Encrypted(bytes32(0), "", bytes32(0), ""),
            State.BIDDING,
            new SecondPrice(msg.sender, itemName)
        );

        emit ListingCreated(
            itemCount,
            itemName,
            msg.sender
        );
        itemCount += 1;
    }

    /// @notice Function to print all the active listings
    /// @return Listing The list of all active listings
    function fetchMarketItems() public view returns (Listing[] memory) {
        uint unsoldItemCount = itemCount - itemBid;
        uint currentIndex = 0;

        Listing[] memory items = new Listing[](unsoldItemCount);
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].state == State.BIDDING) {
                Listing memory currentItem = listings[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /// @notice Function to print all listings put on sale by an user
    /// @return Listing The list of all listings sold by an user
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

    /// @notice Function to print all listings which an user has bid and bought
    /// @return Listing The list of all listings bid upon by an user
    function fetchBoughtItems() public view returns (Listing[] memory) {
        uint cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].auction.fetchBidFromAddress(msg.sender).blindedBid != 0 
                || listings[i].uniqueBuyerID == msg.sender) {
                cnt += 1;
            }
        }

        Listing[] memory items = new Listing[](cnt);
        cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].auction.fetchBidFromAddress(msg.sender).blindedBid != 0 
                || listings[i].uniqueBuyerID == msg.sender) {
                Listing memory currentItem = listings[i];
                items[cnt] = currentItem;
                cnt += 1;
            }
        }
        return items;
    }
    
    /// @notice Function to buy a listing and accepts the money to store in the contract
    /// @dev Triggers the event for logging
    /// @param itemId The item the buyer wants to buy
    /// @param blindBid The hash of bid made by the bidder
    /// @param bidderPubKey The public key of the bidder
    function bidListing(uint itemId, string calldata bidderPubKey, bytes32 blindBid)
        external payable
    {
        require(listings[itemId].auction.fetchBidFromAddress(msg.sender).blindedBid == 0, "Already bidded");

        listings[itemId].auction.bid.value(msg.value)(blindBid, msg.sender, bidderPubKey);

        emit ListingBid(
            listings[itemId].listingID,
            msg.sender,
            msg.value,
            blindBid,
            bidderPubKey
        );
    }

    /// @notice Function to reveal a bid made for a listing
    /// @dev Triggers the event for logging
    /// @param itemId The item the buyer wants to buy
    /// @param value The value of bid made by the bidder
    function revealListing(uint itemId, uint value)
        external returns(bool)
    {
        require(listings[itemId].auction.fetchBidFromAddress(msg.sender).blindedBid != 0, "Not bidded");

        bool successful = listings[itemId].auction.reveal(value, msg.sender);

        emit ListingReveal(
            listings[itemId].listingID,
            msg.sender,
            value,
            successful
        );

        return successful;
    }

    /// @notice Called by the seller to store the password in encrypted form
    /// @dev item password is encrypted
    /// @param itemId Unique Id for the listing
    /// @param iv Initialization vector for the password's encryption
    /// @param ephemPublicKey Seller's ephemeral public key
    /// @param ciphertext Encrypted password string
    /// @param mac Checksum to maintain integrity of the message
    function deliverListing(
      uint itemId,
      bytes32 iv,
      string calldata ephemPublicKey,
      bytes32 ciphertext,
      string calldata mac
    ) external {
        require(msg.sender == listings[itemId].uniqueSellerID, "Only seller can deliver");
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

    /// @notice Function to confirm a listing and transfer money to the seller
    /// @dev Triggers the event for logging
    /// @param itemId The item the buyer wants to confirm
    function confirmListing(uint itemId) external {
        require(listings[itemId].uniqueBuyerID == msg.sender, "Only buyer can confirm");
        listings[itemId].state = State.DELIVERED;

        emit ListingConfirmed(
            listings[itemId].listingID,
            listings[itemId].itemName,
            listings[itemId].uniqueSellerID,
            msg.sender
        );
    }

    /// @notice Function to end bidding phase
    /// @param itemId The ID of the the listings
    function endBiddingPhase(uint itemId) external {
        require(listings[itemId].uniqueSellerID == msg.sender, "Only seller can end bidding");
        require(listings[itemId].state == State.BIDDING, "Listing not in BIDDING state");

        listings[itemId].state = State.REVEAL;
        itemBid += 1;
    }

    /// @notice Function to end reveal phase
    /// @param itemId The ID of the the listings
    /// @returns winner The address of the winner
    function endRevealPhase(uint itemId) external returns(address) {
        require(listings[itemId].uniqueSellerID == msg.sender, "Only seller can end bidding");
        require(listings[itemId].state == State.REVEAL, "Listing not in REVEAL state");

        listings[itemId].state = State.SOLD;
        listings[itemId].uniqueBuyerID = listings[itemId].auction.auctionEnd();
        emit ListingSold (
            itemId,
            listings[itemId].uniqueSellerID,
            listings[itemId].uniqueBuyerID
        );

        return listings[itemId].uniqueBuyerID;
    }
    
    /// @notice Function to get winners public key
    /// @patam itemId The ID of the listing
    function getWinnerPubKey(uint itemId) external view returns(string memory) {
        if (listings[itemId].uniqueBuyerID == address(0)) {
            return "";
        }
        
        return listings[itemId].auction.fetchBidFromAddress(listings[itemId].uniqueBuyerID).bidderPublicKey;
    }

    /// @notice Function that clears the marketplace
    /// @dev Useful for testing
    function killMarketplace() external {
        require(msg.sender == owner, "Only the owner can kill the marketplace");
        selfdestruct(owner);
    }
}
