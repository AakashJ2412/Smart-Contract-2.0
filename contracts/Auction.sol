// pragma solidity >0.4.23 <0.7.0;
          
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
        uint deposit;
        uint reveal;
        string bidderPublicKey;
    }
    /// @dev structure to store all the details about the product 
    struct Details {
        address payable beneficiary;
        bool ended;
        string item;
    }
    Details public details;

    mapping(uint => address payable) public bidders;
    uint bidderCount = 0;
    mapping(address => Bid) public bids;

    /// @dev Finaly bidder and the bid that won the auction. 
    address payable public requiredBidder;
    uint public requiredBid;
    
    /// @notice Triggered to store the details of the created auction.
    /// @dev Must not store the item itself for privacy.
    /// @param beneficiary The seller's address .
    /// @param item The item of auction.
    event AuctionCreated ( 
        address beneficiary,
        string item 
    );

    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs.
    /// @param _beneficiary Address for the sellers address.
    /// @param _item the item on auction.
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

    /// @notice Triggered to store the bidder details and hash.
    /// @dev Hash was the default etheruem hash.
    /// @param bidder address of the bidder.
    /// @param blindedBid Encrypted amount.
    /// @param deposit the amount transferred.
    event BidMade (
        address bidder,
        bytes32 blindedBid,
        uint deposit
    );
    /// @notice Function called by the buyer to make a bid.
    /// @param _blindedBid Encrypted amount.
    /// @param bidder
    /// @param publicKey public key for the bidder.
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
    /// @param bidder Bidder passing the value
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

    /// @notice Triggered to store the details of the auction winner.
    /// @param winner Address of the auction winner.
    /// @param finalPrice Price the auction winner has to pay.
    event AuctionEnded(
        address winner,
        uint finalPrice
    );

    /// @notice Triggered to return the details of the auction winner.
    /// @dev Returns back all the deposit.
    /// @return Address of the auction winner.
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
    
    /// @notice Function to trigger before ending the auction.
    /// @dev No triggers.
    function endTrigger() internal {
        require(true, "Child class does not have the appropriate function");
        return;
    }

    /// @notice Fetches the details of the auction.
    /// @return details structure of the cnotract.
    function fetchDetails() public view returns (Details memory) {
        return details;
    }

    /// @notice Fetches the bid status of the caller.
    /// @return Details of the bid done.
    function fetchBid() public view returns (Bid memory returnBid) {
        return bids[msg.sender];
    }

    /// @notice Fetches the bid status of the given address.
    /// @return Details of the bid.
    function fetchBidFromAddress(address bidder) public view returns (Bid memory returnBid) {
        return bids[bidder];
    }
}

/// @title Auction where the highest bidder has to pay the amount they bid.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice Called from marketplace.
contract FirstPrice is AuctionParent {

    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs and calls the parent constructor.
    /// @param _beneficiary the account to which the amount will be transferred.
    /// @param _item the item on auction.
    constructor(
        address payable beneficiary,
        string memory _item
    ) public AuctionParent(beneficiary, _item) { }
    
    /// @notice Triggered at the end to calculate the average and set the 
    ///         requiredBidder.
    /// @dev Sends back all the amount.
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
        
        requiredBidder = highestBidder;
        requiredBid = highestValue;
    }
}

/// @title Auction where the highest bidder has to pay the second highest bid.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed.
/// @notice Called from marketplace.
contract SecondPrice is AuctionParent {
    /// @dev The highest bid is the winner but the price is second highest
    uint public highestBid;

    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs and calls the parent constructor.
    /// @param _beneficiary the account to which the amount will be transferred.
    /// @param _item the item on auction.
    constructor(
        address payable beneficiary,
        string memory _item
    ) public AuctionParent(beneficiary, _item) { }
    
    /// @notice Triggered at the end to calculate the highest and second highest bid.
    /// @dev Sends back all the amount.
    function endTrigger() internal {
        uint highestValue = bids[bidders[0]].reveal;
        uint secondHighest = highestValue;
        uint highId = 0;
        for(uint i = 1; i < bidderCount; i++) {
          if(bids[bidders[i]].reveal > highestValue) {
            secondHighest = highestValue; 
            highestValue = bids[bidders[i]].reveal;
            highId = i;
          } else if (bids[bidders[i]].reveal > secondHighest) {
            secondHighest = bids[bidders[i]].reveal;
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
        uint refund = bids[highestBidder].deposit - secondHighest;
        highestBidder.transfer(refund);
        
        requiredBidder = highestBidder;
        requiredBid = secondHighest;
    }
}

/// @title Auction where the highest bidder has to pay the amount they bid.
/// @author Aakash Jain, Ishaan Shah, Zeeshan Ahmed
/// @notice Called from marketplace.
contract AveragePrice is AuctionParent {
    ///@dev The bid closest to the average bid is the winner.
    mapping (uint => address payable) public validBidders;
    
    /// @notice Constructor for the auction. 
    /// @dev Triggers event for logs and calls the parent constructor.
    /// @param _beneficiary the account to which the amount will be transferred.
    /// @param _item the item on auction.
    constructor(
        address payable beneficiary,
        string memory _item
    ) public AuctionParent(beneficiary, _item) { }
    
    /// @notice Triggered at the end to calculate the average and set the 
    ///         requiredBidder.
    /// @dev Sends back all the amount.
    function endTrigger() internal {
        uint total = 0;
        
        for (uint i = 0; i < bidderCount; i++) {
            total += bids[bidders[i]].reveal;
        }
        
        int difference = int(bids[bidders[0]].reveal) * int(bidderCount) - int(total);
        difference = difference >= 0 ? difference : -1 * difference;
        uint closestValue = uint(difference);
        uint winId = 0;
        for (uint i = 1; i < bidderCount; i++) {
            uint currentValue = bids[bidders[i]].reveal;
            
            int difference1 = int(currentValue) * int(bidderCount) - int(total);
            difference1 = difference1 >= 0 ? difference1 : -1 * difference1;
            
            if (difference1 < difference) {
                closestValue = currentValue;
                difference = difference1;
                winId = i;
            }
        }

        for (uint i = 0; i < bidderCount; i++) {
            if (i != winId) {
                // The bidder lost, return the value
                bidders[i].transfer(bids[bidders[i]].deposit);
            }
        }

        // All the values have been returned and the final bid has been kept
        // the correct amount has to be transferred to seller and the rest 
        // back to the correct bidder.
        uint refund =  bids[bidders[winId]].deposit - bids[bidders[winId]].reveal;
        bidders[winId].transfer(refund);
        
        requiredBidder = bidders[winId];
        requiredBid = bids[bidders[winId]].reveal;
    }
}
