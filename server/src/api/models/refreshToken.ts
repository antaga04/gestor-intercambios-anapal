import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        tokenHash: { type: String, required: true, unique: true },
        family: { type: String, required: true, index: true },
        expiresAt: { type: Date, required: true },
        createdByIp: { type: String },
        userAgent: { type: String, maxlength: 300 },
        revokedAt: { type: Date },
        replacedByTokenHash: { type: String },
    },
    { timestamps: true, collection: 'refreshtokens' },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenSchema = InferSchemaType<typeof refreshTokenSchema>;
export type RefreshTokenDocument = HydratedDocument<RefreshTokenSchema>;

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
