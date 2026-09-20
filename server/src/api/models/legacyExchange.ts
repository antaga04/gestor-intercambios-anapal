import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';
import { LEGACY_ESTADOS, LEGACY_LINE_TIPOS, ROW_TYPES } from '@anapal/shared';

/**
 * One `intercambios` record of the previous app (Supabase), imported verbatim by `pnpm import-legacy`.
 * Read-only: nothing in the app writes here after the import. See docs/02 "Migración".
 */
const legacyLineSchema = new mongoose.Schema(
    {
        legacyId: { type: String, required: true },
        tipo: { type: String, enum: LEGACY_LINE_TIPOS, required: true },
        numero: { type: String },
        serie: { type: Number },
        fraccion: { type: Number },
        /** As typed in the previous app: billetes, possibly fractional (0.1 = one décimo). */
        billetes: { type: Number, required: true },
        sellado: { type: Boolean, default: false },
        modo: { type: String, enum: ROW_TYPES, required: true },
        migrated: { type: Boolean, default: false },
    },
    { _id: false },
);

const legacyExchangeSchema = new mongoose.Schema(
    {
        legacyId: { type: String, required: true, unique: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
        counterpart: {
            name: { type: String, required: true },
            receptorNumber: { type: String, required: true },
            poblacion: { type: String },
            provincia: { type: String },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
        estado: { type: String, enum: LEGACY_ESTADOS, required: true },
        observaciones: { type: String },
        fecha: { type: Date, required: true },
        envelope: {
            delivered: { type: Boolean, default: false },
            received: { type: Boolean, default: false },
            checked: { type: Boolean, default: false },
        },
        lines: { type: [legacyLineSchema], default: [] },
        migrated: {
            out: { type: mongoose.Schema.Types.ObjectId, ref: 'Exchange' },
            in: { type: mongoose.Schema.Types.ObjectId, ref: 'Exchange' },
        },
    },
    { timestamps: true, collection: 'legacyexchanges' },
);

legacyExchangeSchema.index({ user: 1, fecha: -1 });

export type LegacyExchangeSchemaType = InferSchemaType<typeof legacyExchangeSchema>;
export type LegacyExchangeDocument = HydratedDocument<LegacyExchangeSchemaType>;

export const LegacyExchange = mongoose.model('LegacyExchange', legacyExchangeSchema);
