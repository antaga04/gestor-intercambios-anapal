import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';
import { LIMITS, LOTTERY_SOURCE } from '@anapal/shared';

const serieRangeSchema = new mongoose.Schema(
    {
        from: { type: Number, min: LIMITS.serieMin, max: LIMITS.serieMax, required: true },
        to: { type: Number, min: LIMITS.serieMin, max: LIMITS.serieMax, required: true },
    },
    { _id: false },
);

const lotteryNumberSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
        numero: { type: String, required: true, match: /^\d{5}$/ },
        series: { type: [serieRangeSchema], default: [] },
        source: { type: String, enum: LOTTERY_SOURCE, default: 'manual', required: true },
    },
    { timestamps: true, collection: 'lotterynumbers' },
);

lotteryNumberSchema.index({ user: 1, campaign: 1, numero: 1 }, { unique: true });

export type LotteryNumberSchemaType = InferSchemaType<typeof lotteryNumberSchema>;
export type LotteryNumberDocument = HydratedDocument<LotteryNumberSchemaType>;

export const LotteryNumber = mongoose.model('LotteryNumber', lotteryNumberSchema);
