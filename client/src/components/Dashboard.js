import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import EthCrypto from "eth-crypto";
import ReactLoading from 'react-loading';
import Web3 from "web3";

class Dashboard extends React.Component {
  // marketplace state for appropriate display in current state 
  marketplaceState = {
    0: "Unsold",
    1: "Sold",
    2: "Pending",
    3: "Delivered",
  };

  // auction marketplace state for appropriate display in current state
  auctionState = {
    0: "Bidding",
    1: "Reveal",
    2: "Sold",
    3: "Pending",
    4: "Delivered",
    5: "Unsold",
  };

  // state variable to display type of purchase
  saleState = {
    0: "First bid winner",
    1: "First-price sealed-bid auction",
    2: "Second-price sealed-bid auction",
    3: "Average price auction",
  };

  // contract state variable to switch between appropriate contracts
  contractState = {
    0: "marketplace",
    1: "firstAuction",
    2: "secondAuction",
    3: "averageAuction",
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      soldListings: [],
      boughtListings: [],
      bidListings: [],
    };
  }

  // load all public listings upon loading component
  componentDidMount = async () => {
    if (this.state.loading) {
      await this.getUserListings();
    }
  };

  // function to get all sold and bought listings and store them in page state
  getUserListings = async () => {
    const soldList = [];
    const boughtList = [];
    const bidList = [];

    // loop through all 4 contracts
    for (let i = 0; i < 4; i++) {
      // invoke fetchSoldItems to get list of all items sold or selling by the user
      let ret = await this.props.contracts[this.contractState[i]].methods
        .fetchSoldItems()
        .call({ from: this.props.accounts[0] });
      if (ret) {
        ret.forEach((item) => {
          // append sold items to list
          item.saleType = i;
          if (item.askingPrice) {
            item.askingPrice = Web3.utils.fromWei(item.askingPrice, "ether");
          }
          soldList.push(item);
        });
      }
      // invoke fetchBoughtItems to get list of all items bought by or bid upon by the user
      ret = await this.props.contracts[this.contractState[i]].methods
        .fetchBoughtItems()
        .call({ from: this.props.accounts[0] });
      if (ret) {
        ret.forEach((item) => {
          if (item.uniqueBuyerID !== this.props.accounts[0]) {
            // append bid items to list
            item.saleType = i;
            if (item.askingPrice) {
              item.askingPrice = Web3.utils.fromWei(item.askingPrice, "ether");
            }
            bidList.push(item);
          } else {
            // append bought items to list
            item.saleType = i;
            if (item.askingPrice) {
              item.askingPrice = Web3.utils.fromWei(item.askingPrice, "ether");
            }
            boughtList.push(item);
          }
        });
      }
    }
    // update state with list values
    this.setState({
      loading: false,
      soldListings: soldList,
      boughtListings: boughtList,
      bidListings: bidList,
    });
  };

  // Function called by seller to end bidding state and move to reveal phase
  endBiddingListings = async (itemID, saleType) => {
    try {
      const { contracts } = this.props;
      // invoke endBiddingPhase from contract
      await contracts[this.contractState[saleType]].methods
        .endBiddingPhase(itemID)
        .send({ from: this.props.accounts[0] });
      await this.getUserListings();
    } catch (ex) {
      // Catch any errors for any of the above operations.
      console.log("Error while ending bidding period", ex);
    }
  };

  // Function called by seller to end reveal phase, transact amount, and get winner
  endRevealListings = async (itemID, saleType) => {
    try {
      const { contracts } = this.props;
      // invoke endRevealPhase using .call() and .send() to get return value and update state respectively
      let res = await contracts[this.contractState[saleType]].methods
        .endRevealPhase(itemID)
        .call({ from: this.props.accounts[0] });
      await contracts[this.contractState[saleType]].methods
        .endRevealPhase(itemID)
        .send({ from: this.props.accounts[0] });
      // Give appropriate alert based on return address
      if (res === this.props.accounts[0])
        alert(`Your item wasn't bid upon, and has not been sold`);
      else
        alert(
          `Your auction is completed. The winner for your auction is: ${res}`
        );
      await this.getUserListings();
    } catch (ex) {
      // Catch any errors for any of the above operations.
      console.log("Error while ending reveal period", ex);
    }
  };

  // Function called by buyer to reveal their bid amount
  revealBid = async (itemID, saleType) => {
    try {
      const { contracts, accounts } = this.props;
      // input reveal amount from user and convert to wei
      const amount = Web3.utils.toWei(
        prompt("Please enter your bid amount:"),
        "ether"
      );
      // invoke revealListing using .call() and .send() to get return value and update state respectively
      let res = await contracts[this.contractState[saleType]].methods
        .revealListing(itemID, amount)
        .call({ from: accounts[0] });
      await contracts[this.contractState[saleType]].methods
        .revealListing(itemID, amount)
        .send({ from: accounts[0] });
      // Give appropriate alert based on return bool
      if (res) {
        alert(`Your reveal was successfully accepted.`);
      } else {
        alert(`Your reveal was not accepted. Please enter the correct amount.`);
      }
      await this.getUserListings();
    } catch (ex) {
      // Catch any errors for any of the above operations.
      console.log("Error while trying to submit bid", ex);
    }
  };

  // Function called by seller to input password and deliver the product
  deliverListings = async (itemID, saleType, buyerPubKey) => {
    try {
      const { contracts, accounts } = this.props;

      // Fetch password from seller and encrypt it with buyers public key
      const pwd = prompt("Please enter the product's password:");

      // get buyer's public key
      if (!buyerPubKey) {
        buyerPubKey = await contracts[this.contractState[saleType]].methods
          .getWinnerPubKey(itemID)
          .call({ from: accounts[0] });
      }

      // Encrypt the password
      const encrypted = await EthCrypto.encryptWithPublicKey(buyerPubKey, pwd);

      // invoke deliverListing in contract to update item password
      await contracts[this.contractState[saleType]].methods
        .deliverListing(
          itemID,
          Web3.utils.asciiToHex(encrypted.iv),
          encrypted.ephemPublicKey,
          Web3.utils.asciiToHex(encrypted.ciphertext),
          encrypted.mac
        )
        .send({
          from: accounts[0],
        });
      await this.getUserListings();
    } catch (ex) {
      // Catch any errors for any of the above operations.
      console.log("Error while delivering item", ex);
    }
  };

  // Function called by buyer to confirm delivery of product by the seller
  confirmListings = async (itemID, item, saleType) => {
    try {
      const { accounts, contracts } = this.props;

      // Decrypt the item by inputting user private key
      const privateKey = prompt("Please enter the provided private key:");
      item[0] = Web3.utils.hexToAscii(item[0]);
      item[2] = Web3.utils.hexToAscii(item[2]);
      const pwd = await EthCrypto.decryptWithPrivateKey(privateKey, {
        iv: item[0],
        ephemPublicKey: item[1],
        ciphertext: item[2],
        mac: item[3],
      });

      // Invoke confirmListing in contract and update contract state
      await contracts[this.contractState[saleType]].methods
        .confirmListing(itemID)
        .send({ from: accounts[0] });

      // Deliver the password to buyer
      alert(
        `Thank you for your purchase. The password for your product is: ${pwd}`
      );
      await this.getUserListings();
    } catch (ex) {
      // Catch any errors for any of the above operations.
      console.log("Error while confirming listing", ex);
    }
  };

  render() {
    const { loading, soldListings, boughtListings, bidListings } = this.state;
    // Check if page is loading or not
    if (this.state.loading) {
      return <ReactLoading height={667} width={375} />;
    }

    // Dynamically alter the contents of 3 tables:
    // - Items on Sale
    // - Items bought
    // - Items bid upon
    // Alter output values, buttons, and table fields depending on item state values
    return (
      <Container>
        <Row className="mt-5">
          <Col>
            <h1 className="mb-5"> Items on Sale</h1>
            <Table responsive>
              <thead>
                <tr>
                  <th key="0">S. No</th>
                  <th key="1">Listing Name</th>
                  <th key="2">Listing Description</th>
                  <th key="3">Asking Price</th>
                  <th key="4">Purchase Type</th>
                  <th key="5">State</th>
                  <th key="6">Options</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  soldListings.map((listing, id) => (
                    <tr key={id + "row"}>
                      <td key={id + "a"}>{id + 1}</td>
                      <td key={id + "b"}>{listing.itemName}</td>
                      <td key={id + "c"}>{listing.itemDesc}</td>
                      <td key={id + "d"}>
                        {listing.saleType === 0 ? listing.askingPrice : "n/a"}
                      </td>
                      <td key={id + "e"}>{this.saleState[listing.saleType]}</td>
                      <td key={id + "f"}>
                        {listing.saleType === 0
                          ? this.marketplaceState[listing.state]
                          : this.auctionState[listing.state]}
                      </td>
                      {((listing.saleType === 0 && listing.state === "1") ||
                        (listing.saleType > 0 && listing.state === "2")) && (
                        <td>
                          <Button
                            onClick={() =>
                              this.deliverListings(
                                listing.listingID,
                                listing.saleType,
                                listing.buyerPubKey
                              )
                            }
                          >
                            Deliver
                          </Button>
                        </td>
                      )}
                      {listing.saleType > 0 && listing.state === "0" && (
                        <td>
                          <Button
                            onClick={() =>
                              this.endBiddingListings(
                                listing.listingID,
                                listing.saleType
                              )
                            }
                          >
                            End Bidding Phase
                          </Button>
                        </td>
                      )}
                      {listing.saleType > 0 && listing.state === "1" && (
                        <td>
                          <Button
                            onClick={() =>
                              this.endRevealListings(
                                listing.listingID,
                                listing.saleType,
                                id
                              )
                            }
                          >
                            End Reveal Phase
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Col>
        </Row>
        <Row className="mt-5">
          <Col>
            <h1 className="mb-5"> Items Bought</h1>
            <Table responsive>
              <thead>
                <tr>
                  <th key="0">S. No</th>
                  <th key="1">Listing Name</th>
                  <th key="2">Listing Description</th>
                  <th key="3">Asking Price</th>
                  <th key="4">Purchase Type</th>
                  <th key="5">State</th>
                  <th key="6">Options</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  boughtListings.map((listing, id) => (
                    <tr key={id + "row"}>
                      <td key={id + "a"}>{id + 1}</td>
                      <td key={id + "b"}>{listing.itemName}</td>
                      <td key={id + "c"}>{listing.itemDesc}</td>
                      <td key={id + "d"}>
                        {listing.saleType === 0 ? listing.askingPrice : "n/a"}
                      </td>
                      <td key={id + "e"}>{this.saleState[listing.saleType]}</td>
                      <td key={id + "f"}>
                        {listing.saleType === 0
                          ? this.marketplaceState[listing.state]
                          : this.auctionState[listing.state]}
                      </td>
                      {((listing.saleType === 0 && listing.state === "2") ||
                        (listing.saleType > 0 && listing.state === "3")) && (
                        <td>
                          <Button
                            onClick={() =>
                              this.confirmListings(
                                listing.listingID,
                                listing.item,
                                listing.saleType
                              )
                            }
                          >
                            Confirm
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Col>
        </Row>
        <Row className="mt-5">
          <Col>
            <h1 className="mb-5"> Items Bid On</h1>
            <Table responsive>
              <thead>
                <tr>
                  <th key="0">S. No</th>
                  <th key="1">Listing Name</th>
                  <th key="2">Listing Description</th>
                  <th key="3">Asking Price</th>
                  <th key="4">Purchase Type</th>
                  <th key="5">State</th>
                  <th key="6">Options</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  bidListings.map((listing, id) => (
                    <tr key={id + "row"}>
                      <td key={id + "a"}>{id + 1}</td>
                      <td key={id + "b"}>{listing.itemName}</td>
                      <td key={id + "c"}>{listing.itemDesc}</td>
                      <td key={id + "d"}>
                        {listing.saleType === 0 ? listing.askingPrice : "n/a"}
                      </td>
                      <td key={id + "e"}>{this.saleState[listing.saleType]}</td>
                      <td key={id + "f"}>
                        {listing.saleType === 0
                          ? this.marketplaceState[listing.state]
                          : this.auctionState[listing.state]}
                      </td>
                      {listing.saleType > 0 && listing.state === "1" && (
                        <td>
                          <Button
                            onClick={() =>
                              this.revealBid(
                                listing.listingID,
                                listing.saleType
                              )
                            }
                          >
                            Reveal Bid
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Dashboard;
