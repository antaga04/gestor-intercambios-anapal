import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';

const passwordResetRequestSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        status: { type: String, enum: ['pending', 'resolved'], default: 'pending', required: true },
        requestedAt: { type: Date, required: true, default: () => new Date() },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date },
    },
    { timestamps: true, collection: 'passwordresetrequests' },
);

passwordResetRequestSchema.index({ status: 1, requestedAt: -1 });

export type PasswordResetRequestSchema = InferSchemaType<typeof passwordResetRequestSchema>;
export type PasswordResetRequestDocument = HydratedDocument<PasswordResetRequestSchema>;

export const PasswordResetRequest = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
