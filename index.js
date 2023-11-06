const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.hf0b3tt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Database collection STARTS
const jobsCollection = client.db("workTalesDB").collection("jobs");
const bidsCollection = client.db("workTalesDB").collection("bids");
// Database collection ENDS

// POST a job
app.post("/api/v1/jobs", async (req, res) => {
  const job = req.body;
  const result = await jobsCollection.insertOne(job);
  res.send(result);
});

// GET jobs with category query
app.get("/api/v1/jobs", async (req, res) => {
  let query = {};
  if (req.query?.category) {
    query = { category: req.query?.category };
  } else if(req.query?.employer_email){
    query = {employer_email: req.query?.employer_email}
  }
  const result = await jobsCollection.find(query).toArray();
  res.send(result);
});


// GET a single job with id
app.get("/api/v1/jobs/:id", async (req, res) => {
  const id = req.params?.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.findOne(query);
  res.send(result);
});

// POST a bid
app.post("/api/v1/bids", async (req, res) => {
  const bid = req.body;
  const result = await bidsCollection.insertOne(bid);
  res.send(result);
});

app.get("/", (req, res) => {
  res.send("worktales server is Running");
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
