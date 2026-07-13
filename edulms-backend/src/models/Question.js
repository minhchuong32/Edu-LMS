const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subjectRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    chapter: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    content: {
      type: String,
      required: [true, "Question content is required"],
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [
        (val) => val.length >= 2,
        "A question must have at least 2 options",
      ],
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", questionSchema);
