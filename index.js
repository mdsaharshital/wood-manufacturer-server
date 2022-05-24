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

function verifyJWT(req, res, next) {
  const authToken = req.headers.authorization;
  if (!authToken) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authToken.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "forbidden access " });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7o9n8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  await client.connect();
  const productCollection = client.db("fortunio_timber").collection("products");
  const OderInfoCollection = client
    .db("fortunio_timber")
    .collection("orderInfo");
  console.log("listening from DB");
  try {
    // create jwt
    app.put("/login/:email", async (req, res) => {
      const user = req.body;
      console.log(user);
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });
    // ordered user info
    app.post("/orderInfo", async (req, res) => {
      const orderInfo = req.body;
      const result = await OderInfoCollection.insertOne(orderInfo);
      if (result.acknowledged) {
        res.send({ success: true, message: "order Successfully" });
      }
    });
    // get my orders
    app.get("/myorders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const result = await OderInfoCollection.find({ email }).toArray();
        return res.send(result);
      }
      res.status(403).send({ message: "forbidden access" });
    });
    // get products through id
    app.get("/myorders/:id", async (req, res) => {
      const id = req.params;
      const filter = { _id: ObjectId(id) };
      const result = await OderInfoCollection.findOne(filter);
      res.send(result);
    });
    // delete my orders
    app.delete("/myorders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await OderInfoCollection.deleteOne(query);
      if (result.deletedCount > 0) {
        res.send({ success: true, message: "Canceled successfully" });
      }
    });
    // update a product delivery
    app.post("/product/:id", async (req, res) => {
      const id = req.params;
      const available_quantity = req.body.newQuantity;
      const filter = { _id: ObjectId(id) };
      options = { upsert: true };
      const updatedDoc = { $set: { available_quantity } };
      const results = await productCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
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
