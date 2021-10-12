// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import { FirstPrice } from "./Auction.sol";

/// @title Marketplace for auctioning items.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice View, sell, and bid items.
/// @dev It is assumed that the seller will deliver after getting paid.
contract FirstAuction {
    /// @dev Possible states that a Listing can take.
    enum State { BIDDING, REVEAL, SOLD, PENDING, DELIVERED, UNSOLD }

    /// @dev Stores the encrypted password
    struct Encrypted {
      string iv;
      string ephemPublicKey;
      string ciphertext;
      string mac;
    }

    /// @dev Stores the details of a listing
    struct Listing {
        uint listingID;
        string itemName;
        string itemDesc;
        address payable uniqueSellerID;
        address uniqueBuyerID;
        string buyerPubKey;
        Encrypted item;
        State state;
        FirstPrice auction;
    }

    address payable public owner;
    uint private itemCount = 0;
    uint public itemSold = 0;

    /// @dev mapping for all the Listing
    mapping(uint256 => Listing) private listings;

    /// @notice Constructor to define the marketplace owner.
    constructor() public {
        owner = msg.sender;
    }

    /// @notice Function to add listing to the Auctionplace.
    /// @param itemName Name of the item
    /// @param itemDesc Description of the item set by seller
    /// @param biddingTime time in seconds for bidding
    /// @param revealTime time in seconds for revealing the bid 
    function createListing(
        string memory itemName,
        string memory itemDesc
    ) public payable {
        FirstPrice f = new FirstPrice(
            msg.sender,
            itemName
        );
        listings[itemCount] = Listing(
            itemCount,
            itemName,
            itemDesc,
            msg.sender,
            address(0),
            "",
            Encrypted("", "", "", ""),
            State.BIDDING,
            f
        );
        itemCount += 1;
    }

    /// @notice Function to bid on a listing.
    /// @param itemId The item the buyer wants to buy.
    /// @param blindedBid Encrypted bid.
    function buyListing(uint itemId, bytes32 blindedBid) external {
        listings[itemId].auction.bid(blindedBid, msg.sender);
    }

    /// @notice Function to reveal the bid on a listing.
    /// @param itemId The item the buyer wants to buy
    /// @param value Claimed value of the bid.
    /// @return  Indication of the correctness of the value
    function revealListing(uint itemId, uint value) external returns (bool) {
        return listings[itemId].auction.reveal(value, msg.sender);
    }

    /// @notice Function to end the auction
    /// @param itemId The item the buyer wants to buy
    /// @return Address of the winner of the auction.
    function endListing(uint itemId) external returns (address payable){
        require(msg.sender == listings[itemId].uniqueSellerID, "Only Seller can End");
        address payable winner = listings[itemId].auction.auctionEnd();
        listings[itemId].uniqueBuyerID = winner;
        return winner;
    }

    /// @notice Function for the winner to confirm the product and transfer funds.
    /// @param itemId The item the buyer wants to buy
    /// @return Address of the winner of the auction.
    function confirmListing(uint itemId) external {
        require(msg.sender == listings[itemId].uniqueBuyerID, "Only Buyer can confirm");
        require(listings[itemId].state == State.PENDING, "Delivery unconfirmed");
        listings[itemId].state = State.DELIVERED;
        address payable buyer = msg.sender;
        uint value = listings[itemId].auction.fetchBidValueFromAddress(buyer);
        require(msg.sender.send(value), "Failed to transfer");
    }

    /// @notice Function for the seller to add the string encrypted with winner's public key.
    /// @param itemId The item the buyer wants to buy
    /// @return Address of the winner of the auction.
    function setItem(uint itemId, string calldata enc) external {
        require(msg.sender == listings[itemId].uniqueSellerID, "Only Seller can add");
        listings[itemId].item = enc;
        listings[itemId].state = State.PENDING;
    }

    /// @notice Function to fetch an individual item via itemId
    /// @dev Item password is encrypted or null at all times
    /// @param itemId Unique Id for the listing
    /// @return Listing Object for the particular item ID
    function fetchItem(uint itemId) public view returns (Listing memory) {
      return listings[itemId];
    }

    /// @notice Function to store the encrypted password in the listing object
    /// @dev item password is encrypted before sending to frontend
    /// @param itemId Unique Id for the listing
    /// @param iv Initialization vector for the password's encryption
    /// @param ephemPublicKey Seller's ephemeral public key 
    /// @param ciphertext Encrypted password string
    /// @param mac Checksum to maintain integrity of the message
    function setItem(
      uint itemId,
      string memory iv,
      string memory ephemPublicKey,
      string memory ciphertext,
      string memory mac
    ) public {
      require(msg.sender == listings[itemId].uniqueSellerID, "Invalid user, not the seller");
      listings[itemId].item = Encrypted(
        iv,
        ephemPublicKey,
        ciphertext,
        mac
      ); 
      listings[itemId].state = State.PENDING;
    }

    /// @notice Function to print all the active listings
    /// @dev Listing password is being filtered from listings
    /// @return Listing The list of all active listings
    function fetchMarketItems() public returns (Listing[] memory) {
        uint unsoldItemCount = itemCount - itemSold;
        uint currentIndex = 0;

        Listing[] memory items = new Listing[](unsoldItemCount);
        for (uint i = 0; i < itemCount; i++) {
            Listing memory currentItem = listings[i];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }


    /// @notice Function to print all listings of a particular user
    /// @dev Listing password is being filtered from listings
    /// @return Listing The list of all listings of a certain address
    function fetchUserItems() public view returns (Listing[] memory) {
        uint cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].uniqueSellerID == msg.sender || listings[i].uniqueBuyerID == msg.sender) {
                cnt += 1;
            }
        }
        
        Listing[] memory items = new Listing[](cnt);
        cnt = 0;
        for (uint i = 0; i < itemCount; i++) {
            if (listings[i].uniqueSellerID == msg.sender || listings[i].uniqueBuyerID == msg.sender) {
                Listing memory currentItem = listings[i];
                items[cnt] = currentItem;
                cnt += 1;
            }
        }
        return items;
    }


    /// @notice Function to update the state of the all the auctions
    // function setState() public {
    //     for(uint i = 0; i < itemCount; i++) {
    //         if(listings[i].state == State.DELIVERED)
    //             continue;
    //         if(block.timestamp > listings[i].biddingTime) {
    //             if(block.timestamp < listings[i].revealTime) {
    //                 listings[i].state = State.REVEAL;
    //             } else {
    //                 listings[i].state = State.SOLD;
    //             }
    //         }         
    //     }
    // }


    /// @notice Function that clears the marketplace
    /// @dev Useful for testing 
    function killAuctionplace() external {
        require(msg.sender == owner, "Only the owner can kill the auctionplace");
        selfdestruct(owner);
    }
}

