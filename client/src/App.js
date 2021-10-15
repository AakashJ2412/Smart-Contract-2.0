import React, { Component } from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import CreateListing from "./components/CreateListing";
import Dashboard from "./components/Dashboard";
import Marketplace from "./components/Marketplace";
import Home from "./components/Home";
import Navigation from "./components/Navigation";
import Container from "react-bootstrap/Container";
import getWeb3 from "./getWeb3";
import MarketplaceABI from "./contracts/Marketplace.json";
import FirstAuctionABI from "./contracts/FirstAuction.json";
import SecondAuctionABI from "./contracts/SecondAuction.json";
// import AverageAuctionABI from "./contracts/AverageAuction.json";

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: {} };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const marketplaceNetwork = MarketplaceABI.networks[networkId];
      const marketplaceInstance = new web3.eth.Contract(
        MarketplaceABI.abi,
        marketplaceNetwork && marketplaceNetwork.address
      );

      const firstauctionNetwork = FirstAuctionABI.networks[networkId];
      const firstauctionInstance = new web3.eth.Contract(
        FirstAuctionABI.abi,
        firstauctionNetwork && firstauctionNetwork.address
      );

      const secondauctionNetwork = SecondAuctionABI.networks[networkId];
      const secondauctionInstance = new web3.eth.Contract(
        SecondAuctionABI.abi,
        secondauctionNetwork && secondauctionNetwork.address
      );

      // const averageauctionNetwork = AverageAuctionABI.networks[networkId];
      // const averageauctionInstance = new web3.eth.Contract(
      //   AverageAuctionABI.abi,
      //   averageauctionNetwork && averageauctionNetwork.address
      // );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3,
        accounts,
        contract: {
          marketplace: marketplaceInstance,
          firstAuction: firstauctionInstance,
          secondAuction: secondauctionInstance,
          // averageAuction: averageauctionInstance,
        },
      });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <Router>
        <Navigation />
        <Container>
          <Route path="/" exact component={Home} />
          <Route
            path="/dashboard"
            exact
            render={() => (
              <Dashboard
                contracts={this.state.contract}
                accounts={this.state.accounts}
              />
            )}
          />
          <Route
            path="/marketplace"
            exact
            render={() => (
              <Marketplace
                contracts={this.state.contract}
                accounts={this.state.accounts}
              />
            )}
          />
          <Route
            path="/create-listing"
            exact
            render={() => (
              <CreateListing
                contracts={this.state.contract}
                accounts={this.state.accounts}
              />
            )}
          />
        </Container>
      </Router>
    );
  }
}

export default App;
