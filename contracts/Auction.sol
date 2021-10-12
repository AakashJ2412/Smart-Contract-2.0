// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

/// @title Extension for Marketplace to add Auctions
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice Do not deploy
/// @dev Parent class for the other contracts.
contract AuctionParent {
    /// @dev structure to contain all the information about bids made.
    struct Bid {
        bytes32 blindedBid;
        uint value;
    }

    /// @dev structure to store all the details about the product 
    /// which is being auctioned.
    struct Details {
        address payable beneficiary;
        uint biddingEnd;
        uint revealEnd;
        bool ended;
        string item;
    }
    Details public details;

    mapping(address => Bid) public bids;

    /// @dev Finaly bidder and the bid that won the auction. 
    address payable public requiredBidder;
    uint public requiredBid;

    /// @notice Modifiers for ensuring the events happen before _time
    /// @param _time parameter for checking validity.
    modifier onlyBefore(uint _time) { 
        require(block.timestamp < _time); _;}
    /// @notice Modifiers for ensuring the events happen after _time
    /// @param _time parameter for checking validity.
    modifier onlyAfter(uint _time) { 
        require(block.timestamp > _time); _;}

    
    /// @notice Triggered to store the details of the created auction.
    /// @dev Must not store the item itself for privacy.
    /// @param beneficiary The seller's address .
    /// @param biddingEnd Time in epoch which marks the end of bidding time.
    /// @param revealEnd Time in epoch which marks the end of revealing time.
    /// @param item The item of auction.
    event AuctionCreated ( 
        address beneficiary,
        uint biddingEnd,
        uint revealEnd,
        string item 
    );
    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs.
    /// @param _biddingTime Time in seconds for bidding time.
    /// @param _revealTime Time in seconds for revealing time.
    /// @param _beneficiary Address for the sellers address.
    /// @param _item the item on auction.
    constructor(
        uint _biddingTime,
        uint _revealTime,
        address payable _beneficiary,
        string memory _item
    ) internal {
        details.beneficiary = _beneficiary;
        details.biddingEnd = block.timestamp + _biddingTime;
        details.revealEnd = details.biddingEnd + _revealTime;
        details.item = _item;
        emit AuctionCreated(
            details.beneficiary,
            details.biddingEnd,
            details.revealEnd,
            details.item 
        );
    }

    /// @notice Triggered to store the bidder details and hash.
    /// @dev Hash was the default etheruem hash.
    /// @param bidder address of the bidder.
    /// @param blindedBid Encrypted amount.
    event BidMade (
        address bidder,
        bytes32 blindedBid
    );

    // /// TODO - Verify bid check
    // /// @notice check function to see if bid was made by address or not
    // /// @return boolean result
    // function checkBid() public returns (bool) {
    //     if(bids[msg.sender] )
    //         return true;
    //     return false;
    // }

    /// @notice Function called by the buyer to make a bid.
    /// @param _blindedBid Encrypted amount.
    function bid(bytes32 _blindedBid, address payable _bidder)
        public
        onlyBefore(details.biddingEnd)
    {
        // Only single bid is allowed.
        bids[_bidder] = Bid({
            blindedBid: _blindedBid,
            value: 0
        }); 
        emit BidMade(
            _bidder,
            _blindedBid
        );
    }

    /// @notice Triggered to store the bidders reveal state. 
    /// @param bidder address of the bidder.
    /// @param bidValue the value claimed by the bidder.
    /// @param isCorrect Indicating the correctness of the claim. 
    event RevealMade(
        address bidder,
        uint bidValue,
        bool isCorrect
    );

    /// @notice Called by buyer to reveal the bids he had made.
    /// @dev placeBid is different for different kinds of auction.
    /// @param value The value that is claimed by the buyer.
    function reveal(uint value, address payable beneficiary)
    onlyAfter(details.biddingEnd)
    onlyBefore(details.revealEnd)
        public returns (bool)
    {
        if (bids[beneficiary].blindedBid != keccak256(abi.encodePacked(value))) {
            // Bid was not actually revealed.
            // Do not refund deposit.
            emit RevealMade(
                beneficiary,
                value,
                false
            );
            return false;
        }

        placeBid(beneficiary, value);
        /// Make it impossible for the sender to re-claim
        bids[beneficiary].blindedBid = bytes32(0);
        emit RevealMade(
            beneficiary,
            value,
            true
        );
        return true;
    }

    /// @notice Function to be overloaded by the children contract classes.
    /// @param value The value that is claimed by the buyer.
    function placeBid(address payable bidder, uint value) internal
    {
        require(true, "Child class does not have the appropriate function");
    }

    /// @notice Triggered to store the details of the auction winner.
    /// @param winner Address of the auction winner.
    /// @param finalPrice Price the auction winner has to pay.
    event AuctionEnded(
        address winner,
        uint finalPrice
    );

    /// @notice Triggered to return the details of the auction winner.
    /// @return Address of the auction winner.
    function auctionEnd()
        public
        returns (address payable)
    {
        require(!details.ended);
        details.ended = true;
        endTrigger();
        if(requiredBid != 0) {
            emit AuctionEnded(requiredBidder, requiredBid);
            return requiredBidder;
        }
        emit AuctionEnded(address(0), 0);
        return details.beneficiary;
    }
    
    /// @notice Function to trigger before ending the auction.
    /// @dev Overloaded by the children contracts.
    function endTrigger() internal {
        require(true, "Child class does not have the appropriate function");
        return;
    }

    /// @notice Fetches the details of the auction.
    /// @return details structure of the cnotract.
    function fetchDetails() public view returns (Details memory) {
        Details memory newDetails = Details(
            details.beneficiary,
            details.biddingEnd - block.timestamp,
            details.revealEnd - block.timestamp,
            details.ended,
            details.item
        );

        return newDetails;
    }

    /// @notice Fetches the bid status of the given address.
    /// @return Details of the bid.
    function fetchBidFromAddress(address bidder) 
            public view returns (Bid memory returnBid) 
    {
        return bids[bidder];
    }
    function fetchBidValueFromAddress(address bidder) 
            public view returns (uint) 
    {
        return bids[bidder].value;
    }
}

/// @title Auction where the highest bidder has to pay the amount they bid.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice Called from marketplace.
contract FirstPrice is AuctionParent {
    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs and calls the parent constructor.
    /// @param _biddingTime Time in seconds for bidding time.
    /// @param _revealTime Time in seconds for revealing time.
    /// @param _item the item on auction.
    constructor(
        uint _biddingTime,
        uint _revealTime,
        string memory _item,
        address payable _beneficiary
    ) public AuctionParent(_biddingTime, _revealTime, _beneficiary, _item) { }
    /// @notice Triggered to store the bid and the old value stored. 
    /// @param oldBidder The bidder that was before the current bid.
    /// @param oldValue The value before this bid.
    /// @param doesReplace Indicator if the bid replaced the required bid.
    event PlaceBidFirst(
        address oldBidder,
        uint oldValue,
        bool doesReplace
    );

    /// @notice Function that will update required bidder.
    /// @dev Required bidder details are overwritten if the current bid is 
    ///      higher.
    /// @param bidder Address of the bidder.
    /// @param value The bid amount.
    function placeBid(address payable bidder, uint value) internal 
    {
        if (value <= requiredBid) {
            emit PlaceBidFirst(
                requiredBidder,
                requiredBid,
                false
            );
            return;
        }
        emit PlaceBidFirst(
            requiredBidder,
            requiredBid,
            true
        );
        requiredBid = value;
        requiredBidder = bidder;
    }
    
    /// @notice Function to trigger before ending the auction.
    /// @dev No triggers.
    function endTrigger() internal {
        return;
    }
}

/// @title Auction where the highest bidder has to pay the second highest amount.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice Called from marketplace.
contract SecondPrice is AuctionParent {
    /// @dev structure to contain all the information about bids made.
    uint public highestBid;
    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs and calls the parent constructor.
    /// @param _biddingTime Time in seconds for bidding time.
    /// @param _revealTime Time in seconds for revealing time.
    /// @param _item the item on auction.
    constructor(
        uint _biddingTime,
        uint _revealTime,
        string memory _item,
        address payable _beneficiary
    ) public AuctionParent(_biddingTime, _revealTime, _beneficiary, _item) { }
    
    /// @notice Triggered to store the bid and the old value stored. 
    /// @param oldBidder The bidder that was before the current bid.
    /// @param oldValue The value before this bid.
    /// @param doesReplace Indicator if the bid replaced the required bid.
    event PlaceBidSecond(
        address oldBidder,
        uint oldValue,
        bool doesReplace
    );

    /// @notice Function that will update required bidder.
    /// @dev Required bidder details are overwritten if the current bid is 
    ///      higher. But the value required to be paid is second highest.
    /// @param bidder Address of the bidder.
    /// @param value The bid amount.
    function placeBid(address payable bidder, uint value) internal 
    {
        if (value <= highestBid) {
            emit PlaceBidSecond(
                requiredBidder,
                requiredBid,
                false
            );
            return;
        }
        if (requiredBidder == address(0)) {
            // To ensure that the first bidder does not have to pay 0
            highestBid = value;
        }
        emit PlaceBidSecond(
            requiredBidder,
            requiredBid,
            true 
        );
        requiredBid = highestBid; // the new 2nd highest bid
        highestBid = value;
        requiredBidder = bidder;
    }
    
    /// @notice Function to trigger before ending the auction.
    /// @dev No triggers.
    function endTrigger() internal {
        return;
    }
}

/// @title Auction where the bidder closest to the average value wins.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice Called from marketplace.
contract AveragePrice is AuctionParent {
    /// @dev map to bid values
    mapping(address => uint) public bidValues;
    mapping(uint => address payable) public bidders;
    uint bidderCount = 0;
    
    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs.
    /// @param _biddingTime Time in seconds for bidding time.
    /// @param _revealTime Time in seconds for revealing time.
    /// @param _item the item on auction.
    constructor(
        uint _biddingTime,
        uint _revealTime,
        string memory _item,
        address payable _beneficiary
    ) public AuctionParent(_biddingTime, _revealTime, _beneficiary, _item) { }
    
    /// @notice Function that will store the bidder details.
    /// @dev Just stores the values since the average can only be calcualated
    ///      at the end.
    /// @param bidder Address of the bidder.
    /// @param value The bid amount.
    function placeBid(address payable bidder, uint value) internal 
    {
        bidders[bidderCount] = bidder;
        bidderCount += 1;
        bidValues[bidder] = value;
    }
    
    /// @notice Triggered at the end to calculate the average and set the 
    ///         requiredBidder.
    /// @dev Just stores the values since the average can only be calcualated
    ///      at the end.
    function endTrigger() internal {
        uint total = 0;
        
        // The bid was valid which means that it must be considered 
        // for average and for final winner.
        for (uint i = 0; i < bidderCount; i++) {
            total += bidValues[bidders[i]];
        }
        
        // Now we have the list of the bidders and the total value
        // We find the closest to average value bid and return the rest of it.
        address payable closestBidder = bidders[0];
        uint closestValue = bidValues[closestBidder];

        for (uint i = 1; i < bidderCount; i++) {
            address payable currentBidder = bidders[i];
            uint currentValue = bidValues[currentBidder];
            
            int difference1 = int(closestValue) * int(bidderCount) - int(total);
            difference1 = difference1 >= 0 ? difference1 : -1 * difference1;
            
            int difference2 = int(currentValue) * int(bidderCount) - int(total);
            difference2 = difference2 >= 0 ? difference2 : -1 * difference2;
            
            if (difference2 < difference1) {
                // the new value is closer to the average
                closestBidder = currentBidder;
                closestValue = currentValue;
            }
        }

        // setting the requiredBidder and the value
        bids[closestBidder].blindedBid = bytes32(0);
        requiredBidder = closestBidder;
        requiredBid = closestValue;
        return;
    }
}
