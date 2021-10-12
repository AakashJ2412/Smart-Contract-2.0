import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import EthCrypto from "eth-crypto";

class Marketplace extends React.Component {
  saleState = {
    0: "First bid winner",
    1: "First-price sealed-bid auction",
    2: "Second-price sealed-bid auction",
    3: "Average price auction"
  };

  contractState = {
    0: "marketplace",
    1: "firstAuction",
    2: "secondAuction",
    3: "averageAuction",
  }

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      listings: [],
    };
  }

  componentDidMount = async () => {
    if (this.state.loading) {
      await this.getListings();
    }
  };

  getListings = async () => {
    var itemlist = [];

    for(var i=0;i<4;i++) {
      var ret = await this.props.contracts[this.contractState[i]].methods.fetchMarketItems().call();
      if (ret) {
        ret.forEach((item) => {
          if (this.props.accounts[0] !== item.uniqueSellerID) { 
            itemlist.push(item);
            item.saleType = i;
          }
        });
      }
    }
    this.setState({
      listings: itemlist,
      loading: false,
    });
  };

  buyMarketplaceListings = async (itemID) => {
    try {
      const { privateKey, publicKey } = EthCrypto.createIdentity();
      const { contracts, accounts } = this.props;
      await contracts.marketplace.methods
        .buyListing(itemID, publicKey)
        .send({ from: accounts[0] });
      await this.getListings();

      // TODO: Change to modal
      alert(`This is your private key. Store it securely to complete the transaction. ${privateKey}`);
    } catch (ex) {
      console.log("Error while purchasing listing", ex);
    }
  };

  makeAuctionBid = async (itemID, saleType) => {
    try {
      const { privateKey, publicKey } = EthCrypto.createIdentity();
      const { contracts, accounts } = this.props;
      const amount = prompt("Please enter your bid amount:")
      const amountHash = web3.utils.soliditySha3(amount)
      await contracts[this.contractState[saleType]].methods
      .buyListing(itemID, amountHash, publicKey)
      .send({ from: accounts[0] });
      await this.getListings();

      // TODO: Change to modal
      alert(`This is your private key. Store it securely to complete the transaction. ${privateKey}`);
    } catch (ex) {
      console.log("Error while purchasing listing", ex);
    }
  };

  render() {
    return (
      <Container>
        <Row className="mt-5">
          <Col>
            <h1 className="mb-5"> Marketplace</h1>
            <Table responsive>
              <thead>
                <tr>
                  <th key="0">S. No</th>
                  <th key="1">Listing Name</th>
                  <th key="2">Listing Description</th>
                  <th key="3">Asking Price</th>
                  <th key="4">Purchase Type</th>
                  <th key="5">Options</th>
                </tr>
              </thead>
              <tbody>
                {!this.state.loading &&
                  this.state.listings.map((listing, id) => (
                    <tr key={id + "row"}>
                      <td key={id + "a"}>{id + 1}</td>
                      <td key={id + "b"}>{listing.itemName}</td>
                      <td key={id + "c"}>{listing.itemDesc}</td>
                      <td key={id + "d"}>{listing.saleType === 0 ? (listing.askingPrice) : ("n/a")}</td>
                      <td key={id + "e"}>{this.saleState[listing.saleType]}</td>
                      <td key={id + "f"}>
                        { listing.saleType === 0 ? (
                          <Button
                            onClick={() => this.buyMarketplaceListings(listing.listingID)}
                          >
                            Purchase
                          </Button>
                        ) : (
                          <Button
                            onClick={() => this.makeAuctionBid(listing.listingID,listing.saleType)}
                          >
                            Make Bid
                          </Button>
                        )
                        }
                      </td>
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

export default Marketplace;
