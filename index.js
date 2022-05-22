const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();

const port = process.env.PORT || 5000;

//----- middleware -----
app.use(cors());
app.use(express.json());
//----------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7o9n8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  await client.connect();
  const productCollection = client.db("fortunio_timber").collection("products");
  console.log("listening from DB");
  try {
    // update a product delivery
    app.post("/product/:id", async (req, res) => {
      const id = req.params;
      const available_quantity = req.body.newQuantity;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = { $set: { available_quantity } };
      const results = await productCollection.updateOne(filter, updatedDoc);
      if (results?.acknowledged) {
        res.send({ success: true, message: "Product Booked" });
      }
      console.log(available_quantity);
    });
    // get all products-----------
    app.get("/products", async (req, res) => {
      const query = {};
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });
    // get products through id
    app.get("/product/:id", async (req, res) => {
      const id = req.params;
      const filter = { _id: ObjectId(id) };
      const result = await productCollection.findOne(filter);
      res.send(result);
    });
  } finally {
    //
  }

  //-----------------------
  app.get("/", (req, res) => {
    res.send("Joss Wood manucaturer");
  });
  app.listen(port, () => {
    console.log("listening from", port);
  });
}
run().catch(console.dir);
