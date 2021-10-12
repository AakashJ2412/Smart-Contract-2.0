// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import {FirstPrice} from "./Auction.sol";

/// @title Marketplace for auctioning items.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice View, sell, and bid items.
/// @dev It is assumed that the seller will deliver after getting paid.
contract FirstAuction {
    /// @dev Possible states that a Listing can take.
    enum State { BIDDING, REVEAL, END, DELIVERED, CONFIRMED}

    /// @dev Stores the details of a listing.
    struct Listing {
        uint listingID;
        string itemName;
        string itemDesc;
        address payable uniqueSellerID;
        address payable uniqueBuyerID;
        string item;
        State state;
        uint biddingTime;
        uint revealTime;
        FirstPrice auction;
    }

    mapping(uint256 => Listing) public listings;
    address payable public owner;
    uint private itemCount = 0;
    uint public itemSold = 0;


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
        string memory itemDesc,
        uint biddingTime,
        uint revealTime
    ) public payable {
        FirstPrice f = new FirstPrice(
            biddingTime,
            revealTime,
            itemName,
            msg.sender
        );
        listings[itemCount] = Listing(
            itemCount,
            itemName,
            itemDesc,
            msg.sender,
            address(0),
            "",
            State.BIDDING,
            block.timestamp + biddingTime,
            block.timestamp + revealTime,
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
    function revealListing(uint itemId, uint value) external returns (bool){
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
        require(listings[itemId].state == State.DELIVERED, "Delivery unconfirmed");
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
        listings[itemId].state = State.DELIVERED;
    }

    /// @notice Function to print all the active listings
    /// @dev Listing password is being filtered from listings
    /// @return Listing The list of all active listings
    function fetchBidItems() public returns (Listing[] memory) {
        Listing[] memory items = new Listing[](itemCount);
        uint currentIndex = 0;

        for (uint i = 0; i < itemCount; i++) {
            Listing memory currentItem = listings[i];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }

    /// @notice Function to update the state of the all the auctions
    function setState() public {
        for(uint i = 0; i < itemCount; i++) {
            if(listings[i].state == State.DELIVERED)
                continue;
            if(block.timestamp > listings[i].biddingTime) {
                if(block.timestamp < listings[i].revealTime) {
                    listings[i].state = State.REVEAL;
                } else {
                    listings[i].state = State.END;
                }
            }         
        }
    }


    /// @notice Function that clears the marketplace
    /// @dev Useful for testing 
    function killAuctionplace() external {
        require(msg.sender == owner, "Only the owner can kill the auctionplace");
        selfdestruct(owner);
    }
}

