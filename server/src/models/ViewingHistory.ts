// src/models/ViewingHistory.ts
import mongoose, { type Model, type Types } from "mongoose";

export interface ViewingHistoryFields {
  userId: Types.ObjectId;
  movieId: number;
  lastViewedAt: Date;
}

const viewingHistorySchema = new mongoose.Schema<ViewingHistoryFields>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieId: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "movieId must be an integer",
      },
    },
    lastViewedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { versionKey: false },
);

viewingHistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });
viewingHistorySchema.index({ userId: 1, lastViewedAt: -1 });

export const ViewingHistory =
  (mongoose.models.ViewingHistory as Model<ViewingHistoryFields> | undefined) ??
  mongoose.model<ViewingHistoryFields>("ViewingHistory", viewingHistorySchema);
