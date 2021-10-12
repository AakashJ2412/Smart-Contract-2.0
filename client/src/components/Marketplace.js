import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import EthCrypto from "eth-crypto";

class Marketplace extends React.Component {
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
    var ret = await this.props.marketplace.methods.fetchMarketItems().call();
    var itemlist = [];
    if (ret) {
      ret.forEach((item) => {
        if (this.props.accounts[0] !== item.uniqueSellerID) itemlist.push(item);
      });
    }
    this.setState({
      listings: itemlist,
      loading: false,
    });
  };

  buyListings = async (itemID) => {
    try {
      const { privateKey, publicKey } = EthCrypto.createIdentity();
      const { marketplace, accounts } = this.props;
      await marketplace.methods
        .buyListing(itemID, publicKey)
        .send({ from: accounts[0] });
      await this.getListings();

      // TODO: Change to modal
      alert(`Your private key. Don't forget. ${privateKey}`);
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
                      <td key={id + "d"}>{listing.askingPrice}</td>
                      <td key={id + "e"}>{0}</td>
                      <td key={id + "f"}>
                        <Button
                          onClick={() => this.buyListings(listing.listingID)}
                        >
                          Purchase
                        </Button>
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
