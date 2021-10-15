import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import EthCrypto from "eth-crypto";
import Web3 from "web3";

class Dashboard extends React.Component {
  marketplaceState = {
    0: "Unsold",
    1: "Sold",
    2: "Pending",
    3: "Delivered",
  };

  auctionState = {
    0: "Bidding",
    1: "Reveal",
    2: "Sold",
    3: "Pending",
    4: "Delivered",
    5: "Unsold",
  };

  saleState = {
    0: "First bid winner",
    1: "First-price sealed-bid auction",
    2: "Second-price sealed-bid auction",
    3: "Average price auction",
  };

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

  componentDidMount = async () => {
    if (this.state.loading) {
      await this.getUserListings();
    }
  };

  getUserListings = async () => {
    const soldList = [];
    const boughtList = [];
    const bidList = [];

    for (let i = 0; i < 2; i++) {
      let ret = await this.props.contracts[this.contractState[i]].methods
        .fetchSoldItems()
        .call({ from: this.props.accounts[0] });
      if (ret) {
        ret.forEach((item) => {
          item.saleType = i;
          item.askingPrice = Web3.utils.fromWei(item.askingPrice, "ether");
          soldList.push(item);
        });
      }
      ret = await this.props.contracts[this.contractState[i]].methods
        .fetchBoughtItems()
        .call({ from: this.props.accounts[0] });
      if (ret) {
        ret.forEach((item) => {
          if (item.uniqueBuyerID !== this.props.accounts[0]) {
            item.saleType = i;
            item.askingPrice = Web3.utils.fromWei(item.askingPrice, "ether");
            bidList.push(item);
          } else {
            item.saleType = i;
            item.askingPrice = Web3.utils.fromWei(item.askingPrice, "ether");
            boughtList.push(item);
          }
        });
      }
    }

    this.setState({
      loading: false,
      soldListings: soldList,
      boughtListings: boughtList,
      bidListings: bidList,
    });
  };

  endBiddingListings = async (itemID, saleType) => {
    try {
      const { contracts } = this.props;
      await contracts[this.contractState[saleType]].methods
        .endBiddingPhase(itemID)
        .send({ from: this.props.accounts[0] });
      await this.getUserListings();
    } catch (ex) {
      console.log("Error while ending bidding period", ex);
    }
  };

  endRevealListings = async (itemID, saleType) => {
    try {
      const { contracts } = this.props;
      let res = await contracts[this.contractState[saleType]].methods
        .endRevealPhase(itemID)
        .send({ from: this.props.accounts[0] });
      if (res === this.props.accounts[0])
        alert(`Your item wasn't bid upon, and has not been sold`);
      else
        alert(
          `Your auction is completed. The winner for your auction is: ${res}`
        );
      await this.getUserListings();
    } catch (ex) {
      console.log("Error while ending reveal period", ex);
    }
  };

  revealBid = async (itemID, saleType) => {
    try {
      const { contracts, accounts } = this.props;
      const amount = prompt("Please enter your bid amount:");
      let res = await contracts[this.contractState[saleType]].methods
        .revealListing(itemID, amount)
        .send({ from: accounts[0] });
      if (res) {
        alert(`Your reveal was successfully accepted.`);
      } else {
        alert(`Your reveal was not accepted. Please enter the correct amount.`);
      }
      await this.getUserListings();
    } catch (ex) {
      console.log("Error while trying to submit bid", ex);
    }
  };

  deliverListings = async (itemID, saleType, buyerPubKey) => {
    try {
      const { contracts, accounts } = this.props;

      // Fetch and encrypt the password with buyers public key
      const pwd = prompt("Please enter the product's password:");
      const encrypted = await EthCrypto.encryptWithPublicKey(buyerPubKey, pwd);

      await contracts[this.contractState[saleType]].methods
        .deliverListing(
          itemID,
          encrypted.iv,
          encrypted.ephemPublicKey,
          encrypted.ciphertext,
          encrypted.mac
        )
        .send({
          from: accounts[0],
        });
      await this.getUserListings();
    } catch (ex) {
      console.log("Error while delivering item", ex);
    }
  };

  confirmListings = async (itemID, item, saleType) => {
    try {
      const { accounts, contracts } = this.props;

      // Decrypt the item
      const privateKey = prompt("Please enter the provided private key:");
      const pwd = await EthCrypto.decryptWithPrivateKey(privateKey, item);

      await contracts[this.contractState[saleType]].methods
        .confirmListing(itemID)
        .send({ from: accounts[0] });

      alert(
        `Thank you for your purchase. The password for your product is: ${pwd}`
      );

      await this.getUserListings();
    } catch (ex) {
      console.log("Error while confirming listing", ex);
    }
  };

  render() {
    const { loading, soldListings, boughtListings, bidListings } = this.state;
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
