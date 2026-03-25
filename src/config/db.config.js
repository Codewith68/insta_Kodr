import mongoose from "mongoose";
import config from "./config.js";

export async function connectDB() {
    try {
        await mongoose.connect(config.MONGO_URI); 
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}
