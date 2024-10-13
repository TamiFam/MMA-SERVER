const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET);
const cors = require('cors');

const port = process.env.PORT 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: mongoose } = require('mongoose');
// Middleware
app.use(cors());
app.use(express.json());

// Routes
// SET TOKEN .
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorize access' })
    }
    const token = authorization?.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: true, message: 'forbidden user or token has expired' })
        }
        req.decoded = decoded;
        next()
    })
}

// MONGO DB ROUTES

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@new-life-server.sr6crqh.mongodb.net/?retryWrites=true&w=majority&appName=NEW-LIFE-SERVER`;


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
    



    //create database and collections

    const database = client.db("music_cons");
    const userCollection = database.collection("users");
    const classesCollection = database.collection("classes");
    const cartCollection = database.collection("cart");
    const enrolledCollection = database.collection("enrolled");
    const paymentCollection = database.collection("payments");
    const appliedCollection = database.collection("applied");
     client.connect();

     

     app.post("/api/set-token",async (req,res)=> {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_SECRET,{expiresIn: '24d'})
      res.send({token})
     })
      //middleware for admin and instructor
      const verifyAdmin =  async(req, res,next) => {
        const email = req.decoded.email
        const query = {email: email}
        const user = await userCollection.findOne(query)
        if(user.role === 'admin'){
          next()
        } else {
          res.status(401).send({  message: 'Unauthorized  access' })
        }
     }
     const verifyInstructor = async (req,res,next) =>{
      const email = req.decoded.email
      const query = {email: email}
      const user = await userCollection.findOne(query)
      if(user.role === 'instructor'){
        next()
      } else {
        res.status(401).send({  message: 'Unauthorized access' })
      }
     }

     app.post('/new-user',async (req, res) => {
      const newUser = req.body 
      
      const result = await userCollection.insertOne(newUser)
      res.send(result);
     })

     app.get('/users', async (req, res) => {
      const result = await userCollection.find({}).toArray()
      res.send(result)
     })
     app.get('/users/:id',async (req,res)=> {
      const id = req.params.id
      const query = {_id: new ObjectId(id) }
      const result = await userCollection.findOne(query)
      res.send(result)
     })
     app.get('/user/:email',verifyJWT,async (req,res)=>{ 
      const email = req.params.email
      const query = {email: email}
      const result = await userCollection.findOne(query)
      res.send(result)
     })
     app.delete('/delete-user/:id',verifyJWT,verifyAdmin,async (req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query)
      res.send(result)
     })
     app.put('/update-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedUser = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
    
      
    
      // Добавляем новую информацию к существующей строке
      const updateDoc = { $set: {} };
      Object.keys(updatedUser).forEach((key) => {
        if (updatedUser[key] !== null && updatedUser[key] !== undefined) {
         
            updateDoc.$set[key] = updatedUser[key];
          }
        
      });
    
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    
    app.post('/new-class',  async (req, res) => {
        const newClass = req.body;
       
        // newClass.availableSeats = parseInt(newClass.availableSeats)
        const result = await classesCollection.insertOne(newClass);
        res.send(result);
    });
    app.get('/classes', async (req, res) => {
      const query = { status: 'approved' };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
  })
    //get classes by uctor email adress
    app.get('/classes/:email',verifyJWT,verifyInstructor, async (req, res) => {
        const email = req.params.email
        const query = {instructorEmail: email}
        const result = await classesCollection.find(query).toArray()
        res.send(result)
    })
    //mangage classes
    app.get('/classes-manage', async (req, res) => {
      // const query = {status: "approved" || "approved" };
const result = await classesCollection.find().toArray()
res.send(result)
    })
    //updata classes and reason
    app.put('/change-status/:id',verifyJWT,verifyAdmin ,async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
          
        },
      };
      const result = await classesCollection.updateOne(filter,updateDoc,options)
      res.send(result)
    })
    // get approved classes
    app.get('/approved-classes', async (req, res) => {
      const query = {status: "approved"};
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/class/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
  })
    app.put('/update-class/:id',verifyJWT,verifyInstructor, async (req,res) =>{
      const id = req.params.id;
      const updateClass = req.body
      const filter = {_id: mongoose.Types.ObjectId.createFromHexString(id)}
      const options ={upser: true}
      const updateDoc = {
        $set: {
          name: updateClass.name,
          availableSeats: updateClass.availableSeats,
          status: updateClass.status

        }
        
      }
      const result = await classesCollection.updateOne(filter,options,updateDoc)

      res.send(result)
    })
    // ADD TO CARD
    app.post('/add-to-cart',verifyJWT,async (req, res) => {
      const newCartItem = req.body;
      const result = await cartCollection.insertOne(newCartItem);
      
      res.send(result);
      
  })
  //get card item
  app.get('/cart-item/:id',verifyJWT, async (req, res) => {
    const id = req.params.id
    const email = req.query.email
    const query = {
      userMail: email, 
      classId: id
    }
    const projection = {classId:1}
    const result = await cartCollection.findOne(query, {projection: projection})
    res.send(result)
  })
 
  app.get('/cart/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;
    const query = { userMail: email };
    const projection = { classId: 1 };
    const carts = await cartCollection.find(query, { projection: projection }).toArray();
    const classIds = carts.map(cart => new mongoose.Types.ObjectId(cart.classId));
    const query2 = { _id: { $in: classIds } };
    const result = await classesCollection.find(query2).toArray();
    res.send(result);
})
  //delete card-item

  app.delete('/delete-cart-item/:id',verifyJWT, async(req,res) => {
    const id = req.params.id
    const query = {classId: id}
    const result = await cartCollection.deleteOne(query)
    res.send(result)
  })

  //PAYMENTS ROUTES

  app.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price) * 100
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(items),
      currency: "rub",
      payment_method_types: [
        "card",
      ]
    })
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  })
  //post payment info to db

  app.post('/payment-info', verifyJWT, async (req, res) => {
    const { classesId, userEmail, paymentString, price } = req.body;
    const singleClassid = req.query.classId;
    
    
  
    // Проверка валидности paymentString (этот шаг зависит от вашей бизнес-логики)
    if (!paymentString || paymentString !== '123') {
      return res.status(400).json({ success: false, message: 'Invalid payment string' });
    }
  
    // Проверка на наличие уже записанных классов в коллекции enrolled
    const enrolledClasses = await enrolledCollection.find({ userEmail,  classId: { $in: classesId } }).toArray();
    if (enrolledClasses.length > 0) {
      return res.status(400).json({ success: false, message: 'У тебя уже есть этот курс, дофига богатый?' });
    }
  
    let query;
    let newEnrolledData;
   
  
    if (singleClassid  ) {
      query = { classId: singleClassid, userMail: userEmail };
      newEnrolledData = [{ userEmail, classId:  new  ObjectId(singleClassid) }];
      
    } else {
      query = { classId: { $in: classesId }, userMail: userEmail };
      newEnrolledData = classesId.map(id => ({ userEmail, classId: new ObjectId(id) }));
     
    }
  
  
  
    const updatePromises = classesId.map(id => {
      return classesCollection.updateOne(
        { _id: mongoose.Types.ObjectId.createFromHexString(id) },
        {
          $inc: {
            totalEnrolled: 1, // Увеличиваем totalEnrolled на 1
            availableSeats: -1 // Уменьшаем availableSeats на 1
          }
        }
      );
    });
  
    const updatedResults = await Promise.all(updatePromises);
  
  
    // Вставка новой записи в коллекцию enrolledCollection и удаление записей из коллекции cartCollection:
    const enrolledResults = await enrolledCollection.insertMany(newEnrolledData);
    const deletedResults = await  cartCollection.deleteMany( query)
  
    // Логирование результатов удаления
    console.log('Deleted results:', deletedResults);
  
    // Вставка данных о платеже в коллекцию paymentCollection и отправка ответа:
    const paymentResult = await paymentCollection.insertOne({ classesId, userEmail, paymentString , price});
    res.send({ success: true, paymentResult, deletedResults, enrolledResults, updatedResults, singleClassid, price });
  });

  
  
  //GET PAYMENT HISTORY

  app.get('/payment-history/:email', async (req,res)=>{
    const email = req.params.email
    const query ={userEmail: email}
    const result = await paymentCollection.find(query).sort({date: -1}).toArray() 
    res.send(result)

  })

  //PAYMENT HISTORY LENGTH

  app.get('/payment-history-length:email', async(req,res)=>{
    const email = req.params.email
    const query ={userEmail: email}
    const total = await paymentCollection.countDocuments(query) 
    res.send({total})

  })

  //ENROLLMENT ROUTES

  app.get('/popular_classes', async (req,res)=>{
   
    const result = await classesCollection.find().sort({totalEntolled: -1 }).limit(6).toArray() 
    res.send(result)
  })

  app.get('/popular-instructors', async (req, res) => {
    const pipeline = [
        {
            $group: {
                _id: "$instructorEmail",
                totalEnrolled: { $sum: "$totalEnrolled" },
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id", 
                foreignField: "email", 
                as: "instructor"
            }
        },
       
        {
            $unwind: "$instructor" // Разверните массив instructor, чтобы каждый документ был для каждого инструктора
        },
        {
          $match: {
            "instructor.role": "instructor"
          }
          },
        {
            $project: {
                _id: 0,
                instructor: 1,
                totalEnrolled: 1
            }
        },
        {
            $sort: {
                totalEnrolled: -1
            }
        },
        {
            $limit: 6
        }
    ]
    const result = await classesCollection.aggregate(pipeline).toArray();
    res.send(result);
});
  
//admin status

app.get('/admin-stats',verifyJWT,verifyAdmin,async (req,res)=> {
  const approvedClasses = (await classesCollection.find({status:'approved'}).toArray()).length
  const pendingClasses = (await classesCollection.find({status:'pending'}).toArray()).length
  const instructors = (await userCollection.find({role:'instructor'}).toArray()).length
  const totalClasses = (await classesCollection.find().toArray()).length
  const totalEnrolledClasses = (await classesCollection.find().toArray()).length
  const result ={
    approvedClasses,
    pendingClasses,
    instructors,
    totalClasses,
    totalEnrolledClasses,

  }
  res.send(result)
})
  // !GET ALL INSTrUCTOR  

  app.get('/instructors', async (req, res) => {
    const result = await userCollection.find({ role: 'instructor' }).toArray();
    res.send(result);
})
app.get('/enrolled-item/:id',verifyJWT, async (req, res) => {
  const id = req.params.id
  const email = req.query.email
  const query = {
    userEmail: email, 
    classId: new ObjectId(id)
  }
  const projection = {classId:1}
  const result = await enrolledCollection.findOne(query, {projection: projection})
  res.send(result)
})
app.get('/enrolled-classes/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  const query = { userEmail: email };
  const pipeline = [
      {
          $match: query
      },
      {
          $lookup: {
              from: "classes",
              localField: "classId",   /* этот classId уже имеет тип objectId(если будет не удобно можно будет в pament-info в newEnrollData убрать new ObjectId)               */
              foreignField: "_id",
              as: "classes"
          }
      },
      {
          $unwind: "$classes"
      },
    
      {
          $project: {
              _id: 0,
              classes: 1,
             
          }
      }

  ]
  const result = await enrolledCollection.aggregate(pipeline).toArray();
  // const result = await enrolledCollection.find(query).toArray();
  res.send(result);
})
app.post('/ass-instructor',async (req,res)=> {
  const data = req.body
  const result = await appliedCollection.insertOne(data)
  
  res.send(result)
})
app.get('/applied-instructors/:email', async (req,res)=> {
  const email = req.params.email
  const result = await appliedCollection.findOne({email})
})
    // Send a ping to confirm a successful connection

    // await client.db("user").command({ ping: 1 });
    // await client.db("user").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})