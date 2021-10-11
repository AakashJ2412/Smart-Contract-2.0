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

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = MarketplaceABI.networks[networkId];
      const instance = new web3.eth.Contract(
        MarketplaceABI.abi,
        deployedNetwork && deployedNetwork.address
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runExample);
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
                marketplace={this.state.contract}
                accounts={this.state.accounts}
              />
            )}
          />
          <Route
            path="/marketplace"
            exact
            render={() => (
              <Marketplace
                marketplace={this.state.contract}
                accounts={this.state.accounts}
              />
            )}
          />
          <Route
            path="/create-listing"
            exact
            render={() => (
              <CreateListing
                marketplace={this.state.contract}
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
