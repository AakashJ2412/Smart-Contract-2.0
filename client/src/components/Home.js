import React from "react";
import Carousel from 'react-bootstrap/Carousel';
import '../css/Home.css'

function Home() {
  return (
      <Carousel prevLabel="" nextLabel="" fade={true} variant="dark">
        <Carousel.Item interval={2000}>
          <img
            className="d-block w-100 carouselimg"
            src={"../../img/slide1.png"}
            alt="First slide"
          />
          <Carousel.Caption>
            <h1 className="headertext">Buy/Sell your Netflix Screens</h1>
            <br />
            <p className="bodytext">Use our platform to securely, anonymously, and efficiently sell and purchase your required screens.</p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item interval={2000}>
          <img
            className="d-block w-100 carouselimg"
            src={"../../img/slide2.jpg"}
            alt="Second slide"
          />
          <Carousel.Caption>
            <h1 className="headertext">Ethereum-Based Secure Transactions</h1>
            <br />
            <p className="bodytext">This application uses cryptocurrency to carry out secure transactions, and has taken the necessary steps to protect against hackers and malicious users.</p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item interval={2000}>
          <img
            className="d-block w-100 carouselimg"
            src={"../../img/slide3.jpg"}
            alt="Third slide"
          />
          <Carousel.Caption>
            <h1 className="headertext">Choose your Preferred Auction</h1>
            <br />
            <p className="bodytext">Choose between four different types of methods of selling your screen. Should you wish to sell your screen at a fixed price, or whether you want to put it up for auction, we support it!</p>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>
  );
}



export default Home;
