const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRETE_KEY);
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

async function run() {
  await client.connect();
  const productCollection = client.db("fortunio_timber").collection("products");
  const userCollection = client.db("fortunio_timber").collection("users");
  const paymentCollection = client.db("fortunio_timber").collection("payments");
  const reviewCollection = client.db("fortunio_timber").collection("reviews");
  const userProfileCollection = client
    .db("fortunio_timber")
    .collection("userProfile");
  const OderInfoCollection = client
    .db("fortunio_timber")
    .collection("orderInfo");
  console.log("listening from DB");
  try {
    // verify admin
    // verify
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAcc = await userCollection.findOne({ email: requester });
      if (requesterAcc.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Access denied" });
      }
    };
    // USER PROFILE UPDATE
    app.put("/userProfile", verifyJWT, async (req, res) => {
      const userProfileInfo = req.body;
      const email = userProfileInfo.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = { $set: userProfileInfo };
      const result = await userProfileCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    // user profile fetch
    app.get("/userProfile/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const result = await userProfileCollection.findOne({ email: email });
      res.send(result);
    });
    //make admin
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      // const email = req.params.email;
      const email = req.params.email;
      console.log(email);
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // get admin role
    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email: email });
      const isAdmin = result.role === "admin";
      res.send({ admin: isAdmin });
    });
    // fetch all user
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });
    // get all reviews
    app.get("/getreviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });
    // post a review
    app.post("/addreview", async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.send(result);
    });
    // create jwt
    app.put("/login/:email", async (req, res) => {
      const user = req.body;
      const email = req.params.email;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, {
        expiresIn: "1d",
      });
      //
      const ourUser = {
        email,
      };
      const filter = { email };
      const options = { upsert: true };
      const updatedDoc = { $set: ourUser };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
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
    // get all orders for admin
    app.get("/orders", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await OderInfoCollection.find({}).toArray();
      res.send(result);
    });
    app.put("/orders/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      console.log(filter);
      const options = { upsert: true };
      const updatedDoc = { $set: { status: "shipped" } };
      const result = await OderInfoCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
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

    // get orders through id
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
    // add product through admin
    app.post("/addproduct", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
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
    // delete products through id
    app.delete("/product/:id", async (req, res) => {
      const id = req.params;
      const filter = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(filter);
      res.send(result);
    });

    //-----------
    // ALL PAYMENTS HERE=>
    //-----------
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.estimatedPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    //
    app.patch("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          status: "paid",
          transactionId: payment.transactionId,
        },
      };
      const updateBooking = await OderInfoCollection.updateOne(
        filter,
        updatedDoc
      );
      const result = await paymentCollection.insertOne(payment);
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
