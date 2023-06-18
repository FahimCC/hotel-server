const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;

	if (!authorization) {
		return res
			.status(401)
			.send({ error: true, message: 'Unauthorized access' });
	}
	const token = authorization.split(' ')[1];

	jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ error: true, message: 'Unauthorized access' });
		}
		req.decoded = decoded;
		next();
	});
};

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

		//verifyOwner
		const verifyOwner = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await userCollection.findOne(query);
			if (user.role !== 'owner') {
				return res
					.status(403)
					.send({ error: true, message: 'Forbidden Access' });
			}
			next();
		};
		//verifyAdmin
		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await userCollection.findOne(query);
			if (user.role !== 'admin') {
				return res
					.status(403)
					.send({ error: true, message: 'Forbidden Access' });
			}
			next();
		};

		//jwt
		app.post('/jwt', (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
				expiresIn: '1h',
			});
			res.send({ token });
		});

		//user
		app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
			const result = await userCollection.find().toArray();
			res.send(result);
		});
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
		app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: 'admin',
				},
			};
			const result = await userCollection.updateOne(filter, updateDoc);
			res.send(result);
		});
		app.get('/users/admin/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;

			if (req.decoded?.email !== email) {
				res.send({ admin: false });
			}

			const query = { email: email };
			const user = await userCollection.findOne(query);
			const result = { admin: user?.role === 'admin' };
			res.send(result);
		});
		app.get('/users/owner/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;

			if (req.decoded?.email !== email) {
				res.send({ owner: false });
			}

			const query = { email: email };
			const user = await userCollection.findOne(query);
			const result = { owner: user?.role === 'owner' };
			res.send(result);
		});

		//hotelList
		app.get('/hotel-list/:place', async (req, res) => {
			const place = req.params.place;
			const query = { districtName: place };
			const result = await hotelCollection.find(query).toArray();
			res.send(result);
		});
		app.get('/all-rooms', verifyJWT, verifyOwner, async (req, res) => {
			const result = await hotelCollection.find().toArray();
			res.send(result);
		});
		app.delete('/all-rooms/:id', verifyJWT, verifyOwner, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await hotelCollection.deleteOne(query);
			res.send(result);
		});
		app.get('/manage-rooms', verifyJWT, verifyAdmin, async (req, res) => {
			const result = await hotelCollection.find().toArray();
			res.send(result);
		});
		app.delete(
			'/manage-rooms/:id',
			verifyJWT,
			verifyAdmin,
			async (req, res) => {
				const id = req.params.id;
				const query = { _id: new ObjectId(id) };
				const result = await hotelCollection.deleteOne(query);
				res.send(result);
			}
		);
		app.get('/hotel-book/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await hotelCollection.findOne(query);
			res.send(result);
		});
		app.post('/add-room', verifyJWT, verifyOwner, async (req, res) => {
			const room = req.body;
			const result = await hotelCollection.insertOne(room);
			res.send(result);
		});
		app.get('/update-room-get/:id', verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await hotelCollection.findOne(query);
			res.send(result);
		});
		app.patch('/update-room-patch/:id', verifyJWT, async (req, res) => {
			const id = req.params.id;
			const room = req.body;
			const query = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					hotelImage: room?.hotelImage,
					twoBedAvailable: room?.twoBedAvailable,
					deluxeAvailable: room?.deluxeAvailable,
					penthouseAvailable: room?.penthouseAvailable,
					ratings: room?.ratings,
					twoBedPrice: room?.twoBedPrice,
					deluxePrice: room?.deluxePrice,
					penthousePrice: room?.penthousePrice,
					description: room?.description,
				},
			};
			const result = await hotelCollection.updateOne(query, updateDoc);
			res.send(result);
		});

		//bookingCollection
		app.post('/booking-collection', verifyJWT, async (req, res) => {
			const bookingInfo = req.body;
			bookingInfo.status = 'Booked';
			const result = await bookingCollection.insertOne(bookingInfo);
			res.send(result);
		});
		app.get('/all-bookings', async (req, res) => {
			const result = await bookingCollection.find().toArray();
			res.send(result);
		});
		app.get('/own-bookings-get/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const result = await bookingCollection.find(query).toArray();
			res.send(result);
		});
		app.patch('/own-bookings-patch/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					status: 'Canceled',
				},
			};
			const result = await bookingCollection.updateOne(query, updateDoc);
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
