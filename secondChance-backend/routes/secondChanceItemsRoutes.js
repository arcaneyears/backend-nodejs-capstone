/*jshint esversion: 8 */
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }
        cb(null, directoryPath); // Specify the upload directory
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use the original file name
    },
});

const upload = multer({ storage: storage });

// Get all secondChanceItems  -> GET /api/secondchance/items
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.error('oops something went wrong', e);
        next(e);
    }
});

// Add a new item (with file upload) -> POST /api/secondchance/items
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        let secondChanceItem = req.body;

        // Get the last id, increment it by 1, and set it to the new item
        const lastItemQuery = await collection.find().sort({ 'id': -1 }).limit(1).toArray();
        const lastId = lastItemQuery.length ? parseInt(lastItemQuery[0].id, 10) : 0;
        secondChanceItem.id = (lastId + 1).toString();

        // Set the current date in the new item
        secondChanceItem.date_added = Math.floor(new Date().getTime() / 1000);
        if (req.file) {
            secondChanceItem.image = `/images/${req.file.originalname}`;
        }

        const result = await collection.insertOne(secondChanceItem);
        secondChanceItem._id = result.insertedId;
        res.status(201).json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID -> GET /api/secondchance/items/:id
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id: id });
        if (!secondChanceItem) {
            return res.status(404).send("secondChanceItem not found");
        }
        res.json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

// Update an existing item -> PUT /api/secondchance/items/:id
router.put('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id: id });
        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }

        const update = {
            category: req.body.category,
            condition: req.body.condition,
            age_days: req.body.age_days,
            description: req.body.description,
            age_years: Number((req.body.age_days / 365).toFixed(1)),
            updatedAt: new Date()
        };

        const updatepreloveItem = await collection.findOneAndUpdate(
            { id: id },
            { $set: update },
            { returnDocument: 'after' }
        );
        if (updatepreloveItem) {
            res.json({ "uploaded": "success" });
        } else {
            res.json({ "uploaded": "failed" });
        }
    } catch (e) {
        next(e);
    }
});

// Delete an existing item -> DELETE /api/secondchance/items/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id: id });
        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }
        await collection.deleteOne({ id: id });
        res.json({ "deleted": "success" });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
