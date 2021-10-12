import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useFormik } from "formik";

function CreateListing({ marketplace, accounts }) {
  const formik = useFormik({
    initialValues: {
      itemName: "",
      itemDesc: "",
      isAuctioned: false,
      askingPrice: 0,
    },
  });

  async function createListing(event) {
    if (event) {
      event.preventDefault();
    }

    // TODO: Add `isAuctioned` once implemented and remove `item`
    try {
      const { askingPrice, itemName, itemDesc, isAuctioned } = formik.values;
      await marketplace.methods
        .createListing(askingPrice, itemName, itemDesc)
        .send({ from: accounts[0] });
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
              <Form.Check
                id="isAuctioned"
                type="checkbox"
                label="Auction"
                value={formik.values.isAuctioned}
                onChange={formik.handleChange}
              />
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
