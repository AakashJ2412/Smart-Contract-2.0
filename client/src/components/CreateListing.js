import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useFormik } from "formik";

function CreateListing({ contracts, accounts }) {
  
  const formik = useFormik({
    initialValues: {
      itemName: "",
      itemDesc: "",
      saleType: 0,
      askingPrice: 0,
    },
  });

  async function createListing(event) {
    if (event) {
      event.preventDefault();
    }

    try {
      const { askingPrice, itemName, itemDesc, saleType } = formik.values;
      if(saleType === 0)
      {  
        await contracts.marketplace.methods
          .createListing(askingPrice, itemName, itemDesc)
          .send({ from: accounts[0] });
      }
      else if(saleType === 1)
      {
        await contracts.firstAccount.methods
          .createListing(itemName, itemDesc)
          .send({ from: accounts[0] });
      }
      else if(saleType === 2)
      {
        await contracts.secondAccount.methods
          .createListing(itemName, itemDesc)
          .send({ from: accounts[0] });
      }
      else if(saleType === 3)
      {
        await contracts.averageAccount.methods
          .createListing(itemName, itemDesc)
          .send({ from: accounts[0] });
      }

    } catch (ex) {
      console.log("Error while creating listing", ex);
    }
  }

  return (
    <Container>
      <Row className="mt-5 justify-content-center">
        <Col xs={6}>
          <Form onSubmit={createListing}>
            <Form.Group className="mb-3">
              <Form.Label>Item Name</Form.Label>
              <Form.Control
                id="itemName"
                type="text"
                placeholder="Enter item name"
                value={formik.values.itemName}
                onChange={formik.handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Item Description</Form.Label>
              <Form.Control
                id="itemDesc"
                as="textarea"
                type="text"
                placeholder="Enter Item Description"
                rows={4}
                value={formik.values.itemDesc}
                onChange={formik.handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Select
                id="saleType"
                value={formik.values.saleType}
                onChange={formik.handleChange}
              >
                <option value="0">First Bid Winner</option>
                <option value="1">First-price sealed-bid auction</option>
                <option value="2">Second-price sealed-bid auction</option>
                <option value="3">Average price auction</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col xs={6}>
                {!formik.values.isAuctioned && (
                  <Form.Group className="mb-3">
                    <Form.Label>Item Price</Form.Label>
                    <Form.Control
                      id="askingPrice"
                      type="number"
                      placeholder="Enter item price"
                      value={formik.values.askingPrice}
                      onChange={formik.handleChange}
                    />
                  </Form.Group>
                )}
              </Col>
            </Row>
            <Button variant="primary" type="submit">
              Submit
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default CreateListing;
