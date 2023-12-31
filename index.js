const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://intask-client.vercel.app",
      "https://worktales-client.web.app",
      "https://worktales-client.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// JWT related middlewares
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unauthorized" });
    }
    // if token is valid then only it would be decoded
    req.user = decoded;
    next();
  });
};

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
    // await client.connect();

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
const testimonialsCollection = client
  .db("workTalesDB")
  .collection("testimonials");
// Database collection ENDS

// // JWT related apis START
app.post("/api/v1/jwt", (req, res) => {
  const user = req.body;

  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ success: true });
});

app.post("/api/v1/logout", (req, res) => {
  const user = req.body;
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});
// JWT related apis ENDS

// POST a job
app.post("/api/v1/jobs", verifyToken, async (req, res) => {
  const job = req.body;
  const result = await jobsCollection.insertOne(job);
  res.send(result);
});

// GET jobs with category query
app.get("/api/v1/jobs", async (req, res) => {
  let query = {};
  if (req.query?.category) {
    query = { category: req.query?.category };
  }
  const result = await jobsCollection.find(query).toArray();
  res.send(result);
});

app.get("/api/v1/postedJobs", verifyToken, async (req, res) => {
  if (req?.query?.employer_email !== req.user?.email) {
    return res.status(403).send({ message: "forbidden" });
  }
  let query = {};
  if (req.query?.employer_email) {
    query = { employer_email: req.query?.employer_email };
  }
  const result = await jobsCollection.find(query).toArray();
  res.send(result);
});

// GET a single job with id
app.get("/api/v1/jobs/:id", verifyToken, async (req, res) => {
  const id = req.params?.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.findOne(query);
  res.send(result);
});

// UPDATE a job, with PUT method
app.put("/api/v1/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const job = req.body;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updatedJob = {
    $set: {
      job_title: job.title,
      deadline: job.deadline,
      price_range: job.price_range,
      description: job.description,
      category: job.updatedCategory,
    },
  };
  const result = await jobsCollection.updateOne(filter, updatedJob, options);
  res.send(result);
});

// DELETE a job
app.delete("/api/v1/jobs/:id", async (req, res) => {
  const id = req.params?.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.deleteOne(query);
  res.send(result);
});

//localhost:5000/api/v1/bids?userEmail=joey@gmail.com&sortField=status&sortOrder=asc

// GET bids on user email and employer email query and also sort method
app.get("/api/v1/bids", verifyToken, async (req, res) => {
  if ((req.query?.userEmail || req.query?.employerEmail) !== req.user?.email) {
    return res.status(403).send({ message: "forbidden" });
  }
  let query = {};
  let sortObj = {};
  if (req.query?.userEmail) {
    query = { userEmail: req?.query?.userEmail };
  } else if (req?.query?.employerEmail) {
    query = { employerEmail: req?.query?.employerEmail };
  }

  if (req?.query?.sortField && req?.query?.sortOrder) {
    sortObj[req?.query?.sortField] = req?.query?.sortOrder;
  }
  const result = await bidsCollection.find(query).sort(sortObj).toArray();
  res.send(result);
});

// POST a bid
app.post("/api/v1/bids", async (req, res) => {
  const bid = req.body;
  const result = await bidsCollection.insertOne(bid);
  res.send(result);
});

// PATCH; bid status: rejected/accepted/complete
app.patch("/api/v1/bids/:id", async (req, res) => {
  const id = req?.params.id;
  const status = req.body;
  const filter = { _id: new ObjectId(id) };
  const updatedBid = {
    $set: {
      status: status.status,
    },
  };
  const result = await bidsCollection.updateOne(filter, updatedBid);
  res.send(result);
});

// GET testimonials
app.get("/api/v1/testimonials", async (req, res) => {
  const result = await testimonialsCollection.find().toArray();
  res.send(result);
});

app.get("/", (req, res) => {
  res.send("worktales server is Running");
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
