const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

//verifyJWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ylecqg.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    //database collection
    const usersCollection = client.db("skill-builder").collection("users");
    const classCollection = client.db("skill-builder").collection("classes");
    const enrolledClassCollection = client.db("skill-builder").collection("enrolled");
    const pendingClassCollection = client.db("skill-builder").collection("pending-classes");
    const selectedClassCollection = client.db("skill-builder").collection("selected-classes");

//create JWTtoken
app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

  res.send({ token })
})

//verifyAdmin
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email }
  const user = await usersCollection.findOne(query);
  if (user?.role !== 'admin') {
    return res.status(403).send({ error: true, message: 'forbidden message' });
  }
  next();
}


//verifyInstrucror
const verifyInstrucror = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email }
  const user = await usersCollection.findOne(query);
  if (user?.role !== 'instructor') {
    return res.status(403).send({ error: true, message: 'forbidden message' });
  }
  next();
}

//get users
app.get('/users', async(req, res)=>{
    const result = await usersCollection.find().toArray();
      res.send(result);
})

//get admin
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    res.send({ admin: false })
  }

  const query = { email: email }
  const user = await usersCollection.findOne(query);
  const result = { admin: user?.role === 'admin' }
  res.send(result);
})

//get instructors
app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    res.send({ instructor: false })
  }

  const query = { email: email }
  const user = await usersCollection.findOne(query);
  const result = { instructor: user?.role === 'instructor' }
  res.send(result);
})

//post users
app.post('/users', async(req, res)=>{
  const user = req.body;
      const query = { email: user.email }
      const exist = await usersCollection.findOne(query);

      if (exist) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
})

//user dashboard 

//get enrolled classes
app.get('/enrolled', verifyJWT, async(req, res)=>{
  const userEmail = req.query.email;
console.log(userEmail);

  if (!userEmail) {
    res.send([]);
  }
  const decodedEmail = req.decoded.email;
  if (userEmail !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }
let query={}
if (req.query?.email) {
      query = {
        email: req.query.email,
      };
}
  const result = await enrolledClassCollection.find(query).toArray();
  res.send(result);
  
})

//post selected classes
app.post('/selected', verifyJWT, async(req, res)=>{
  const selectedClass =req.body
  console.log(selectedClass);
  const result = await selectedClassCollection.insertOne(selectedClass)
  res.send(result)
})

//get selected classes
app.get('/selected', verifyJWT, async(req, res)=>{
  const userEmail = req.query.email;
console.log(userEmail);

  if (!userEmail) {
    res.send([]);
  }
  const decodedEmail = req.decoded.email;
  if (userEmail !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }
let query={}
if (req.query?.email) {
      query = {
        email: req.query.email,
      };
}
  const result = await selectedClassCollection.find(query).toArray();
  res.send(result);
  
})

//get selected class 
app.get('/selectedclasses', async(req, res)=>{
  const result = await selectedClassCollection.find().toArray();
  res.send(result);
})
//delete selected class
app.delete('/selected/:id', verifyJWT, async (req, res)=>{
  const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
})

//get all classes
app.get('/classes', async(req, res)=>{
    const result = await classCollection.find().toArray();
      res.send(result);
})


//instructor dashboard
//post a new class

app.post('/classes', verifyJWT, verifyInstrucror, async(req, res)=>{
  const newClass =req.body
  const result = await classCollection.insertOne(newClass)
  res.send(result)
})

//get classes for instructor
app.get('/instructorclasses', async(req, res)=>{
  const instructorEmail = req.query.email;



  // if (!instructorEmail) {
  //   res.send([]);
  // }
  // const decodedEmail = req.decoded.email;
  // if (instructorEmail !== decodedEmail) {
  //   return res.status(403).send({ error: true, message: 'forbidden access' })
  // }

  let query={}
  if (req.query?.email) {
      query = {
      email: req.query.email,
    };
}

console.log(req.query.email);
  const result = await classCollection.find(query).toArray();
  res.send(result);
  
})

//admin dashboard
//get api for all classes

app.get('/allclasses', verifyJWT, verifyAdmin, async(req, res)=>{
     const result = await classCollection.find().toArray();
      res.send(result);
})

//update class status
app.patch('/allclasses/:id', async(req, res)=>{
  const id = req.params.id;
        console.log(id);
        console.log(req.body.status);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: req.body.status
          }
        };
  
        const result = await classCollection.updateOne(filter, updateDoc);
        res.send(result);
  })


//get all users
app.get("/allusers", verifyJWT, verifyAdmin, async(req, res)=>{
  const result = await usersCollection.find().toArray();
      res.send(result);
})

//update user role to instructor
app.patch('/allusers/makeinstructor/:id', async(req, res)=>{
const id = req.params.id;
      console.log(id);
      
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
})

//update user role to admin
app.patch('/allusers/makeadmin/:id', async(req, res)=>{
  const id = req.params.id;
        console.log(id);
        
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'admin'
          },
        };
  
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
  })


  //paymenet related api
  //create payment intent api
  app.post('/create-payment-intent', verifyJWT, async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card']
    });

    res.send({
      clientSecret: paymentIntent.client_secret
    })
  })

  //post payment details 
  app.post('/payments', verifyJWT, async (req, res) => {
    const payment = req.body;
    const insertResult = await enrolledClassCollection.insertOne(payment);


    const query = {_id: new ObjectId(req.body.selectedId)}
    const deleteResult = await selectedClassCollection.deleteOne(query);
    

    res.send({ insertResult, deleteResult });
    
  })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//test
app.get('/', (req, res) => {
    res.send('Running')
  })
  
  app.listen(port, () => {
    console.log(`Running on port ${port}`);
  })