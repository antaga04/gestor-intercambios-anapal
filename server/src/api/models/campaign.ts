import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';

const campaignSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 80 },
        drawDate: { type: Date, required: true },
        exchangeDeadline: { type: Date, required: true },
        isActive: { type: Boolean, default: false, required: true },
        barcode: {
            type: new mongoose.Schema(
                {
                    dayDigit: { type: String, enum: ['5', '6'], required: true },
                    jornada: { type: String, required: true, match: /^\d{1,3}$/ },
                },
                { _id: false },
            ),
            required: false,
        },
        landingText: { type: String, maxlength: 4000 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true, collection: 'campaigns' },
);

// Only one active campaign at a time.
campaignSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export type CampaignSchema = InferSchemaType<typeof campaignSchema>;
export type CampaignDocument = HydratedDocument<CampaignSchema>;

export const Campaign = mongoose.model('Campaign', campaignSchema);
