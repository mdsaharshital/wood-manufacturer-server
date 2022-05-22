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
  try {
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
