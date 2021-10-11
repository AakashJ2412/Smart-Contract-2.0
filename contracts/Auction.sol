// pragma solidity >0.4.23 <0.7.0;
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;
contract AuctionParent {
    struct Bid {
        // the hash
        bytes32 blindedBid;
        uint value;
    }

    // seller input stuff
    struct Details {
        address payable beneficiary;
        uint biddingEnd;
        uint revealEnd;
        bool ended;
        string item;
    }
    Details public details;

    mapping(address => Bid) public bids;

    address payable public requiredBidder;
    uint public requiredBid;

    /// Ensures time reqiurements
    modifier onlyBefore(uint _time) { require(block.timestamp < _time); _; }
    modifier onlyAfter(uint _time) { require(block.timestamp > _time); _; }

    
    event AuctionCreated ( 
        address beneficiary,
        uint biddingEnd,
        uint revealEnd,
        string item 
    );
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

    event BidMade (
        address bidder,
        bytes32 blindedBid
    );
    /// Send the bit _blindedBid is the hash of the amount
    function bid(bytes32 _blindedBid)
        public
        onlyBefore(details.biddingEnd) // must be before the auction ends.
    {
        bids[msg.sender] = Bid({
            blindedBid: _blindedBid,
            value: 0
        }); // Only single bid is allowed.
        emit BidMade(
            msg.sender,
            _blindedBid
        );
    }

    event RevealMade(
        address bidder,
        uint bidValue,
        bool isCorrect
    );
    /// Reveal your blinded bids. 
    function reveal(uint value)
        public
        onlyAfter(details.biddingEnd) 
        onlyBefore(details.revealEnd) 
    {
        if (bids[msg.sender].blindedBid != keccak256(abi.encodePacked(value))) {
            // Bid was not actually revealed.
            // Do not refund deposit.
            emit RevealMade(
                msg.sender,
                value,
                false
            );
            return;
        }

        placeBid(msg.sender, value);
        /// Make it impossible for the sender to re-claim
        bids[msg.sender].blindedBid = bytes32(0);
        emit RevealMade(
            msg.sender,
            value,
            true
        );
    }
    /// The appropriate bid 
    function placeBid(address payable bidder, uint value) internal
    {
        require(true, "Child class does not have the appropriate function");
    }

    /// End the auction and send the highest bid to the beneficiary.
    event AuctionEnded(
        address winner,
        uint finalPrice
    );
    function auctionEnd()
        public
        onlyAfter(details.revealEnd)
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
    
    function endTrigger() internal {
        require(true, "Child class does not have the appropriate function");
        return;
    }

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
    function fetchBid() public view returns (Bid memory returnBid) {
        return bids[msg.sender];
    }

    function fetchBidFromAddress(address bidder) 
            public view returns (Bid memory returnBid) 
    {
        return bids[bidder];
    }
}

contract FirstPrice is AuctionParent {
    /// The highest bid is the winner
    constructor(
        uint _biddingTime,
        uint _revealTime,
        string memory _item
    ) public AuctionParent(_biddingTime, _revealTime, msg.sender, _item) { }
    
    event PlaceBidFirst(
        address oldBidder,
        uint oldValue,
        bool doesReplace
    );

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
    
    function endTrigger() internal {
        // no triggers
        return;
    }
}

contract SecondPrice is AuctionParent {
    /// The highest bid is the winner but the price is second highest
    uint public highestBid;
    constructor(
        uint _biddingTime,
        uint _revealTime,
        string memory _item
    ) public AuctionParent(_biddingTime, _revealTime, msg.sender, _item) { }
    
    event PlaceBidSecond(
        address oldBidder,
        uint oldValue,
        bool doesReplace
    );

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
    
    function endTrigger() internal {
        // no triggers
        return;
    }
}

contract AveragePrice is AuctionParent {
    // The bid closest to the average bid is the winner.
    mapping(address => uint) public bidValues;
    mapping(uint => address payable) public bidders;
    mapping (uint => address payable) public validBidders;
    uint bidderCount = 0;
    
    constructor(
        uint _biddingTime,
        uint _revealTime,
        string memory _item
    ) public AuctionParent(_biddingTime, _revealTime, msg.sender, _item) { }
    
    function placeBid(address payable bidder, uint value) internal 
    {
        // can be assumed that the bid is valid since the verification happens
        // first.
        bidders[bidderCount] = bidder;
        bidderCount += 1;
        bidValues[bidder] = value;
    }
    
    // calculating the average of the valid bids
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
