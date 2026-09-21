import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    exercises: [
      {
        bodyPart: {
          type: String,
          required: true,
        },

        exercise: {
          type: String,
          required: true,
        },

        sets: {
          type: String,
          default: "3 × 10",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Workout = mongoose.model("Workout", workoutSchema);

export default Workout;