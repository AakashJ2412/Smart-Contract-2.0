// pragma solidity >0.4.23 <0.7.0;
          
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;
contract AuctionParent {
    struct Bid {
        // the hash
        bytes32 blindedBid;
        uint deposit;
        uint reveal;
        string bidderPublicKey;
    }

    // seller input stuff
    struct Details {
        address payable beneficiary;
        bool ended;
        string item;
    }
    Details public details;

    mapping(uint => address payable) public bidders;
    uint bidderCount = 0;
    mapping(address => Bid) public bids;

    address payable public requiredBidder;
    uint public requiredBid;
    
    event AuctionCreated ( 
        address beneficiary,
        string item 
    );
    constructor(
        address payable _beneficiary,
        string memory _item
    ) internal {
        details.beneficiary = _beneficiary;
        details.item = _item;
        emit AuctionCreated(
            details.beneficiary,
            details.item 
        );
    }

    event BidMade (
        address bidder,
        bytes32 blindedBid,
        uint deposit
    );
    /// Send the bit _blindedBid is the hash of the amount
    function bid(bytes32 _blindedBid, address bidder, string memory publicKey)
        public
        payable
    {
        bids[bidder] = Bid({
            blindedBid: _blindedBid,
            deposit: msg.value,
            reveal: 0,
            bidderPublicKey: publicKey
        }); // Only single bid is allowed.
        emit BidMade(
            bidder,
            _blindedBid,
            msg.value
        );
    }

    event RevealMade(
        address bidder,
        uint bidValue,
        bool isCorrect
    );
    /// Reveal your blinded bids. 
    /// If incorrect the value entered is incorrect no refunded
    /// If the transferred amount is less than the claimed value 
    /// it is returned
    /// If a more appropriate value is found then the value is again refunded.
    function reveal(uint value, address payable bidder) public returns (bool)
    {
        require(bids[bidder].reveal == 0, "Bid already revealed");
        if (bids[bidder].blindedBid != keccak256(abi.encodePacked(value))){
            // Bid was not actually revealed.
            // Do not refund deposit.
            emit RevealMade(
                bidder,
                value,
                false
            );
            return false;
        }
        bids[bidder].reveal = value;
        if(bids[bidder].deposit >= value) {
            // Keeping track of valid bidders
            bidders[bidderCount] = bidder;
            bidderCount += 1;
        }

        emit RevealMade(
            bidder,
            value,
            true
        );
        return true;
    }
    /// End the auction and send the highest bid to the beneficiary.
    event AuctionEnded(
        address winner,
        uint finalPrice
    );
    function auctionEnd()
        public returns (address)
    {
        require(!details.ended, "Auction already ended");
        details.ended = true;
        endTrigger();
        details.beneficiary.transfer(requiredBid);
        emit AuctionEnded(requiredBidder, requiredBid);
        return requiredBidder;
    }
    
    function endTrigger() internal {
        require(true, "Child class does not have the appropriate function");
        return;
    }

    function fetchDetails() public view returns (Details memory) {
        return details;
    }
    function fetchBid() public view returns (Bid memory returnBid) {
        return bids[msg.sender];
    }
    function fetchBidFromAddress(address bidder) public view returns (Bid memory returnBid) {
        return bids[bidder];
    }
}

contract FirstPrice is AuctionParent {
    /// The highest bid is the winner
    constructor(
        address payable beneficiary,
        string memory _item
    ) public AuctionParent(beneficiary, _item) { }
    
    function endTrigger() internal {
        uint highestValue = bids[bidders[0]].reveal;
        uint highId = 0;
        for(uint i = 1; i < bidderCount; i++)
        {
            if(bids[bidders[i]].reveal > highestValue) {
                highestValue = bids[bidders[i]].reveal;
                highId = i;
            }
        }
        for (uint i = 0; i < bidderCount; i++) {
            if (i != highId) {
                // The bidder lost, return the value
                bidders[i].transfer(bids[bidders[i]].deposit);
            }
        }
        address payable highestBidder = bidders[highId];
        
        // All the values have been returned and the final bid has been kept
        // the correct amount has to be transferred to seller and the rest 
        // back to the correct bidder.
        uint refund = bids[highestBidder].deposit - highestValue;
        highestBidder.transfer(refund);
        bids[highestBidder].blindedBid = bytes32(0);
        
        requiredBidder = highestBidder;
        requiredBid = highestValue;
        
        return;
    }
}

contract SecondPrice is AuctionParent {
    /// The highest bid is the winner but the price is second highest
    uint public highestBid;
    constructor(
        address payable beneficiary,
        string memory _item
    ) public AuctionParent(beneficiary, _item) { }
    
    function endTrigger() internal {
        if(bidderCount == 0) {
            requiredBidder == details.beneficiary;
            requiredBid = 0;
            return;
        }
        address payable highestBidder = bidders[0];
        uint highestValue = bids[highestBidder].reveal;
        uint secondHighest = highestValue;
        for (uint i = 0; i < bidderCount; i++) {
            address payable curBidder = bidders[i];
            if (bids[curBidder].reveal <= highestValue) {
                // The bidder lost, return the value
                curBidder.transfer(bids[curBidder].deposit);
                continue;
            }
            highestBidder = curBidder;
            secondHighest = highestValue;
            highestValue = bids[curBidder].reveal;
        }
        
        // All the values have been returned and the final bid has been kept
        // the correct amount has to be transferred to seller and the rest 
        // back to the correct bidder.
        uint refund =  bids[highestBidder].deposit - secondHighest;
        highestBidder.transfer(refund);
        bids[highestBidder].blindedBid = bytes32(0);
        
        requiredBidder = highestBidder;
        requiredBid = secondHighest;
        
        return;
    }
}

contract AveragePrice is AuctionParent {
    // The bid closest to the average bid is the winner.
    mapping (uint => address payable) public validBidders;
    
    constructor(
        address payable beneficiary,
        string memory _item
    ) public AuctionParent(beneficiary, _item) { }
    
    /// So far no money has been returned in the revealing period of the 
    /// auction since to calculate the average values we need to have all the values.
    function endTrigger() internal {
        if(bidderCount == 0) {
            requiredBidder == details.beneficiary;
            requiredBid = 0;
            return;
        }
        uint total = 0;
        
        for (uint i = 0; i < bidderCount; i++) {
            address payable bidder = bidders[i];
            total += bids[bidder].reveal;
        }
        
        // Now we have the list of the correct bidders and the total value
        // We find the closest to average value bid and return the rest of it.
        address payable closestBidder = bidders[0];
        uint closestValue = bids[closestBidder].reveal;
        for (uint i = 1; i < bidderCount; i++) {
            address payable currentBidder = bidders[i];
            uint currentValue = bids[currentBidder].reveal;
            
            int difference1 = int(closestValue) * int(bidderCount) - int(total);
            difference1 = difference1 >= 0 ? difference1 : -1 * difference1;
            
            int difference2 = int(currentValue) * int(bidderCount) - int(total);
            difference2 = difference2 >= 0 ? difference2 : -1 * difference2;
            
            if (difference2 < difference1) {
                // the new value is closer to the average
                closestBidder.transfer(bids[closestBidder].deposit);
                bids[closestBidder].blindedBid = bytes32(0);
                
                closestBidder = currentBidder;
                closestValue = currentValue;
            } else {
                // If the new bid is not closed then return all the amount back
                currentBidder.transfer(bids[currentBidder].deposit);
                bids[currentBidder].blindedBid = bytes32(0);
            }
        }
        // All the values have been returned and the final bid has been kept
        // the correct amount has to be transferred to seller and the rest 
        // back to the correct bidder.
        uint refund =  bids[closestBidder].deposit - closestValue;
        closestBidder.transfer(refund);
        bids[closestBidder].blindedBid = bytes32(0);
        
        requiredBidder = closestBidder;
        requiredBid = closestValue;
        
        return;
    }
}
