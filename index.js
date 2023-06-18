const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ws55k5x.mongodb.net/?retryWrites=true&w=majority`;

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

		const userCollection = client.db('hotel').collection('users');
		const hotelCollection = client.db('hotel').collection('hotelList');
		const bookingCollection = client.db('hotel').collection('bookingList');

		//user
		app.post('/users', async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existsUser = await userCollection.findOne(query);

			if (existsUser) {
				return res.send({ message: 'user already exists.' });
			}
			user.role = 'client';
			const result = await userCollection.insertOne(user);
			res.send(result);
		});

		//hotelList
		app.get('/hotel-list/:place', async (req, res) => {
			const place = req.params.place;
			const query = { districtName: place };
			const result = await hotelCollection.find(query).toArray();
			res.send(result);
		});
		app.get('/hotel-book/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await hotelCollection.findOne(query);
			res.send(result);
		});

		//bookingCollection
		app.post('/bookingCollection', async (req, res) => {
			const bookingInfo = req.body;
			const result = await bookingCollection.insertOne(bookingInfo);
			res.send(result);
		});

		// Send a ping to confirm a successful connection
		await client.db('admin').command({ ping: 1 });

		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get('/', (req, res) => {
	res.send('Hotel is running...');
});

app.listen(port, () => {
	console.log(`Hotel is running on port: ${port}`);
});
