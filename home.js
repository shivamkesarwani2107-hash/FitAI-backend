import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./user.js";
import bcrypt from "bcryptjs";
import Joi from "joi";
import jwt from "jsonwebtoken";
import Product from "./product.js";
import Membership from "./membership.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "./order.js";
import Workout from "./workout.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({

  key_id: process.env.RAZORPAY_KEY_ID,

  key_secret: process.env.RAZORPAY_KEY_SECRET,

});


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MONGODB CONNECTED SUCCESSFULLY");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FitAI backend is running",
  });
});

app.post("/signup", async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Signup failed",
      error: error.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

app.post("/products", async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      oldPrice,
      image,
      description,
      stock,
    } = req.body;

    const product = await Product.create({
      name,
      category,
      price,
      oldPrice,
      image,
      description,
      stock,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product creation failed",
      error: error.message,
    });
  }
});

app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
});

app.post("/memberships", async (req, res) => {
  try {
    const {
      userId,
      duration,
      price,
      startDate,
      endDate,
    } = req.body;

    if (!userId || !duration || !price) {
      return res.status(400).json({
        success: false,
        message: "UserId, duration and price are required",
      });
    }

    const membership = await Membership.create({
      userId,
      duration,
      price,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      message: "Membership created successfully",
      membership,
    });
  } catch (error) {
    console.error("MEMBERSHIP CREATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Membership creation failed",
      error: error.message,
    });
  }
});

app.get("/memberships", async (req, res) => {
  try {
    const memberships = await Membership.find()
      .populate("userId", "name email");

    res.json({
      success: true,
      memberships,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch memberships",
      error: error.message,
    });
  }
});

app.get("/memberships/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await Membership.findById(id)
      .populate("userId", "name email");

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    res.json({
      success: true,
      membership,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch membership",
      error: error.message,
    });
  }
});

app.get("/memberships/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const memberships = await Membership.find({
      userId,
    });

    res.json({
      success: true,
      memberships,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user memberships",
      error: error.message,
    });
  }
});

app.post("/payment/create-order", async (req, res) => {
  try {
    const { amount, type, duration } = req.body;

    if (!amount || !type) {
      return res.status(400).json({
        success: false,
        message: "Amount and payment type are required",
      });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `fitai_${Date.now()}`,
      notes: {
        type,
        duration: duration || "",
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("RAZORPAY ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message,
    });
  }
});

app.post("/payment/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      type,
      duration,
      price,
      productId,
      productName,
      quantity,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required",
      });
    }

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    if (type === "membership") {
      const startDate = new Date();

      const endDate = new Date(startDate);

      if (duration === "1 Month") {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      if (duration === "3 Months") {
        endDate.setMonth(endDate.getMonth() + 3);
      }

      if (duration === "6 Months") {
        endDate.setMonth(endDate.getMonth() + 6);
      }

      const membership = await Membership.create({
        userId,
        duration,
        price,
        status: "active",
        startDate,
        endDate,
      });

      return res.json({
        success: true,
        message: "Payment successful and membership activated",
        paymentId: razorpay_payment_id,
        membership,
      });
    }

    if (type === "product") {
      const order = await Order.create({
        userId,

        items: [
          {
            productId,
            productName,
            price: price / quantity,
            quantity,
          },
        ],

        totalAmount: price,

        paymentId: razorpay_payment_id,

        razorpayOrderId: razorpay_order_id,

        paymentStatus: "paid",

        orderStatus: "placed",
      });

      return res.json({
        success: true,
        message: "Payment successful and order created",
        paymentId: razorpay_payment_id,
        order,
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("PAYMENT VERIFY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      paymentId,
      razorpayOrderId,
    } = req.body;

    if (
      !userId ||
      !items ||
      items.length === 0 ||
      !totalAmount ||
      !paymentId ||
      !razorpayOrderId
    ) {
      return res.status(400).json({
        success: false,
        message: "All order details are required",
      });
    }

    const order = await Order.create({
      userId,
      items,
      totalAmount,
      paymentId,
      razorpayOrderId,
      paymentStatus: "paid",
      orderStatus: "placed",
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("ORDER CREATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .populate("items.productId", "name price image")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

app.get("/orders/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({
      userId,
    })
      .populate("items.productId", "name price image")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET USER ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user orders",
      error: error.message,
    });
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("userId", "name email")
      .populate("items.productId", "name price image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

app.post("/workouts", async (req, res) => {
  try {
    const { userId, bodyPart, exercise, sets } = req.body;

    if (!userId || !bodyPart || !exercise) {
      return res.status(400).json({
        success: false,
        message: "User, body part and exercise are required",
      });
    }

    let workout = await Workout.findOne({ userId });

    if (!workout) {
      workout = await Workout.create({
        userId,
        exercises: [
          {
            bodyPart,
            exercise,
            sets: sets || "3 × 10",
          },
        ],
      });
    } else {
      const alreadyAdded = workout.exercises.some(
        (item) =>
          item.bodyPart === bodyPart &&
          item.exercise === exercise
      );

      if (alreadyAdded) {
        return res.status(400).json({
          success: false,
          message: "Exercise already added",
        });
      }

      workout.exercises.push({
        bodyPart,
        exercise,
        sets: sets || "3 × 10",
      });

      await workout.save();
    }

    res.status(201).json({
      success: true,
      message: "Exercise added to workout",
      workout,
    });
  } catch (error) {
    console.error("ADD WORKOUT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add exercise",
      error: error.message,
    });
  }
});

app.get("/workouts/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const workout = await Workout.findOne({ userId });

    res.json({
      success: true,
      workout,
    });
  } catch (error) {
    console.error("GET WORKOUT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workout",
      error: error.message,
    });
  }
});

app.get("/workouts/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const workouts = await Workout.find({
      userId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      workouts,
    });
  } catch (error) {
    console.error("GET USER WORKOUTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workouts",
      error: error.message,
    });
  }
});

app.delete("/workouts/:workoutId/exercises/:exerciseId", async (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;

    const workout = await Workout.findById(workoutId);

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: "Workout not found",
      });
    }

    const exerciseExists = workout.exercises.some(
      (item) => item._id.toString() === exerciseId
    );

    if (!exerciseExists) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found",
      });
    }

    workout.exercises = workout.exercises.filter(
      (item) => item._id.toString() !== exerciseId
    );

    await workout.save();

    res.json({
      success: true,
      message: "Exercise removed successfully",
      workout,
    });
  } catch (error) {
    console.error("REMOVE EXERCISE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove exercise",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `FitAI backend running on http://localhost:${PORT}`
  );
});