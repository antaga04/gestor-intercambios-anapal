import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ROLES, USER_STATUS } from '@anapal/shared';

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true, select: false },
        role: { type: String, enum: ROLES, default: 'user', required: true },
        status: { type: String, enum: USER_STATUS, default: 'pending', required: true },
        receptorNumber: { type: String, required: true, unique: true, trim: true, match: /^\d{1,6}$/ },
        name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
        poblacion: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
        provincia: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
        address: { type: String, trim: true, maxlength: 160 },
        phone: { type: String, trim: true, maxlength: 20 },
        contactName: { type: String, trim: true, maxlength: 80 },
        mustChangePassword: { type: Boolean, default: false },
        lastLoginAt: { type: Date },
        lastSeenAt: { type: Date },
        verificationEmailsSent: { type: Number, default: 0 },
        /** Sends within the 24h window that started at lastVerificationEmailAt (reset when the window expires). */
        verificationEmailsWindowCount: { type: Number, default: 0 },
        lastVerificationEmailAt: { type: Date },
        /** `auth.users.id` of the previous app when the account was imported by `pnpm import-legacy`. */
        legacyId: { type: String },
    },
    { timestamps: true, collection: 'users' },
);

userSchema.index({ name: 'text', poblacion: 'text' });
userSchema.index({ legacyId: 1 }, { unique: true, sparse: true });

export type UserSchema = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserSchema>;

export const PUBLIC_USER_FIELDS = 'receptorNumber name poblacion provincia address phone contactName';
export const ME_USER_FIELDS = `${PUBLIC_USER_FIELDS} email role status mustChangePassword createdAt`;
export const ADMIN_USER_FIELDS = `${ME_USER_FIELDS} lastLoginAt lastSeenAt verificationEmailsSent updatedAt`;

export const User = mongoose.model('User', userSchema);
