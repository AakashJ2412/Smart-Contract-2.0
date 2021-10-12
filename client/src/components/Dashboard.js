import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import EthCrypto from "eth-crypto";
import Web3 from "web3";

class Dashboard extends React.Component {
  itemState = {
    0: "Unsold",
    1: "Sold",
    2: "Pending",
    3: "Delivered",
    4: "Bidding",
    5: "Revealed",
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      soldListings: [],
      boughtListings: [],
    };
  }

  componentDidMount = async () => {
    if (this.state.loading) {
      await this.getUserListings();
    }
  };

  getUserListings = async () => {
    const ret = await this.props.marketplace.methods.fetchUserItems().call({
      from: this.props.accounts[0],
    });
    const soldList = [];
    const boughtList = [];
    if (ret) {
      ret.forEach((item) => {
        if (this.props.accounts[0] === item.uniqueSellerID) {
          soldList.push(item);
        } else if (this.props.accounts[0] == item.uniqueBuyerID) {
          boughtList.push(item);
        }
      });
    }

    this.setState({
      loading: false,
      soldListings: soldList,
      boughtListings: boughtList,
    });
  };

  deliverListings = async (itemID) => {
    try {
      // TODO: Make modal
      const { marketplace, accounts } = this.props;
      const item = await marketplace.methods.fetchItem(itemID).call();

      // Fetch and encrypt the password with buyers public key
      const pwd = prompt("Please enter the product's password:");
      const encrypted = await EthCrypto.encryptWithPublicKey(
        item.buyerPubKey,
        pwd
      );

      await marketplace.methods
        .setItem(
          itemID,
          encrypted.iv,
          encrypted.ephemPublicKey,
          encrypted.ciphertext,
          encrypted.mac
        )
        .send({
          from: accounts[0],
        });
    } catch (ex) {
      console.log("Error while delivering item", ex);
    }
  };

  confirmListings = async (itemID, price) => {
    try {
      const { accounts, marketplace } = this.props;

      // Decrypt the item
      const privateKey = prompt("Please enter the provided private key:");
      const item = await marketplace.methods.fetchItem(itemID).call();
      const pwd = await EthCrypto.decryptWithPrivateKey(privateKey, item.item);

      await marketplace.methods
        .confirmListing(itemID)
        .send({ from: accounts[0], value: Web3.utils.toWei(price, "ether") });

      alert(`Thank you for your purchase. The password for your product is: ${pwd}`);

      await this.getUserListings();
    } catch (ex) {
      console.log("Error while confirming listing", ex);
    }
  };

  render() {
    const { loading, soldListings, boughtListings } = this.state;
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
                      <td key={id + "d"}>{listing.askingPrice}</td>
                      <td key={id + "e"}>{0}</td>
                      <td key={id + "f"}>{this.itemState[listing.state]}</td>
                      {listing.state === "1" && (
                        <td>
                          <Button
                            onClick={() =>
                              this.deliverListings(
                                listing.listingID,
                                listing.item
                              )
                            }
                          >
                            Deliver
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
                      <td key={id + "d"}>{listing.askingPrice}</td>
                      <td key={id + "e"}>{0}</td>
                      <td key={id + "f"}>{this.itemState[listing.state]}</td>
                      {listing.state === "2" && (
                        <td>
                          <Button
                            onClick={() =>
                              this.confirmListings(
                                listing.listingID,
                                listing.askingPrice
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
      </Container>
    );
  }
}

export default Dashboard;
