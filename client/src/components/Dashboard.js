import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";

class Dashboard extends React.Component {
  itemState = {
    0: "Unsold",
    1: "Sold",
    2: "Delivered",
    3: "Bidding",
    4: "Revealed",
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
    const ret = await this.props.marketplace.methods.fetchUserItems().call();
    const soldList = [];
    const boughtList = [];
    if (ret) {
      ret.forEach((item) => {
        console.log(item);
        if (this.props.accounts[0] === item.uniqueSellerID) soldList.push(item);
        else if (item.state === 1 || item.state === 2) boughtList.push(item);
      });
    }

    this.setState({
      loading: false,
      soldListings: soldList,
      boughtListings: boughtList,
    });
  };

  deliverListings = async (itemID, price) => {
    try {
      const { accounts, marketplace } = this.props;
      await marketplace.methods
        .confirmListing(itemID)
        .send({ from: accounts[0], value: price });
      await this.getUserListings();
    } catch (ex) {
      console.log("Error while confirming listing", ex);
    }
  };

  relistListings = async (itemID, item) => {
    try {
      const { accounts, marketplace } = this.props;
      await marketplace.methods
        .relistListing(itemID, item)
        .send({ from: accounts[0] });
      await this.getUserListings();
    } catch (ex) {
      console.log("Error while relisting listing", ex);
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
                {!loading ? (
                  soldListings.map((listing, id) => (
                    <tr key={id + "row"}>
                      <td key={id + "a"}>{id + 1}</td>
                      <td key={id + "b"}>{listing.itemName}</td>
                      <td key={id + "c"}>{listing.itemDesc}</td>
                      <td key={id + "d"}>{listing.askingPrice}</td>
                      <td key={id + "e"}>{0}</td>
                      <td key={id + "f"}>{this.itemState[listing.state]}</td>
                      {listing.state === 1 ? (
                        <td>
                          <Button
                            onClick={() =>
                              this.relistListings(
                                listing.listingID,
                                listing.item
                              )
                            }
                          >
                            Relist
                          </Button>
                        </td>
                      ) : (
                        <td></td>
                      )}
                    </tr>
                  ))
                ) : (
                  <></>
                )}
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
                {!loading ? (
                  boughtListings.map((listing, id) => (
                    <tr key={id + "row"}>
                      <td key={id + "a"}>{id + 1}</td>
                      <td key={id + "b"}>{listing.itemName}</td>
                      <td key={id + "c"}>{listing.itemDesc}</td>
                      <td key={id + "d"}>{listing.askingPrice}</td>
                      <td key={id + "e"}>{0}</td>
                      <td key={id + "f"}>{this.itemState[listing.state]}</td>
                      {listing.state === 1 ? (
                        <td>
                          <Button
                            onClick={() =>
                              this.deliverListings(
                                listing.listingID,
                                listing.askingPrice
                              )
                            }
                          >
                            Confirm
                          </Button>
                        </td>
                      ) : (
                        <td></td>
                      )}
                    </tr>
                  ))
                ) : (
                  <></>
                )}
              </tbody>
            </Table>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Dashboard;
