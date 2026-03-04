import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const saveGameSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    slot: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    day: { type: Number, default: 1 },
    resources: {
      cash: { type: Number, default: 0 },
      influence: { type: Number, default: 0 },
      respect: { type: Number, default: 0 }
    },
    stateVersion: { type: Number, default: 1 },
    meta: {
      playerLevel: { type: Number, default: 1 },
      playerXp: { type: Number, default: 0 },
      crimesCommitted: { type: Number, default: 0 },
      objectivesCompleted: { type: Number, default: 0 },
      lastStoryEntry: { type: String, default: '' }
    },
    state: { type: Schema.Types.Mixed, required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

saveGameSchema.index({ userId: 1, slot: 1 }, { unique: true });

export type SaveGameDocument = InferSchemaType<typeof saveGameSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SaveGameModel =
  mongoose.models.SaveGame || mongoose.model('SaveGame', saveGameSchema);
