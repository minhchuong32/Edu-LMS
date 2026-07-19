const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Refresh token string is required"],
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User association is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration timestamp is required"],
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    replacedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove expired refresh tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
