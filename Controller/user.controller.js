const userModel = require("../models/user.model");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require("dotenv").config();

// Fetch all users (emails)
const fetchEmail = (req, res) => {
    userModel.find()
        .then((users) => {
            // Extract only emails from users
            const emails = users.map(user => user.Email);
            res.status(200).json({ status: true, emails });
        })
        .catch((err) => {
            console.error("Error fetching emails:", err);
            res.status(500).json({ status: false, message: "Error fetching emails" });
        });
};

// Signup function - NO EMAIL
const signup = async (req, res) => {
    try {
        const { Name, Email, Password } = req.body;

        // Validate input
        if (!Name || !Email || !Password) {
            return res.status(400).json({ 
                status: false, 
                message: 'All fields are required: Name, Email, Password' 
            });
        }

        // Check if the user already exists
        const existingUser = await userModel.findOne({ Email: Email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ 
                status: false, 
                message: 'User already exists with this email' 
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Create and save the new user
        const newUser = new userModel({ 
            Name: Name.trim(), 
            Email: Email.toLowerCase().trim(), 
            Password: hashedPassword 
        });
        
        await newUser.save();
        console.log("User saved successfully:", newUser._id);

        res.status(201).json({ 
            status: true, 
            message: "User registered successfully",
            userId: newUser._id 
        });

    } catch (err) {
        console.error("Error while saving user:", err);
        res.status(500).json({ 
            status: false, 
            message: "Error while saving user",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Signin function
const signin = async (req, res) => {
    try {
        const { Email, Password } = req.body;

        // Validate input
        if (!Email || !Password) {
            return res.status(400).json({ 
                status: false, 
                message: 'Email and password are required' 
            });
        }

        // Check if the user exists
        const user = await userModel.findOne({ Email: Email.toLowerCase().trim() });
        
        if (!user) {
            console.log('Signin failed: User not found for email:', Email);
            return res.status(401).json({ 
                status: false, 
                message: 'Invalid credentials' 
            });
        }

        // Compare password with the hashed password
        const isMatch = await bcrypt.compare(Password, user.Password);
        
        if (!isMatch) {
            console.log('Signin failed: Password mismatch for user:', Email);
            return res.status(401).json({ 
                status: false, 
                message: 'Invalid credentials' 
            });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                Email: user.Email,
                Name: user.Name 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        console.log('Login successful for user:', Email);

        // Return user data (excluding password)
        const userData = {
            id: user._id,
            Name: user.Name,
            Email: user.Email,
            createdAt: user.createdAt
        };

        res.status(200).json({ 
            status: true, 
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (err) {
        console.error("Error during signin:", err);
        res.status(500).json({ 
            status: false, 
            message: 'Error during signin',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Optional: Token verification endpoint
const verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ status: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select('-Password');
        
        if (!user) {
            return res.status(401).json({ status: false, message: 'User not found' });
        }

        res.status(200).json({ 
            status: true, 
            message: 'Token is valid',
            user 
        });
    } catch (err) {
        console.error("Token verification error:", err);
        res.status(401).json({ 
            status: false, 
            message: 'Invalid or expired token' 
        });
    }
};

module.exports = {
    signup,
    signin,
    fetchEmail,
    verifyToken
};