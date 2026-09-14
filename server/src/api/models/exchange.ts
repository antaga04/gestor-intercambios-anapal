import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';
import { EXCHANGE_STATUS, LIMITS, ROW_TYPES, exchangeTotalDecimos, rowAmountDecimos } from '@anapal/shared';

const serieFraccionSchema = new mongoose.Schema(
    {
        serie: { type: Number, min: LIMITS.serieMin, max: LIMITS.serieMax, required: true },
        fraccion: { type: Number, min: LIMITS.fraccionMin, max: LIMITS.fraccionMax, required: true },
    },
    { _id: false },
);

const rowDetailsSchema = new mongoose.Schema(
    {
        // type: billete
        serieFrom: { type: Number, min: LIMITS.serieMin, max: LIMITS.serieMax },
        serieTo: { type: Number, min: LIMITS.serieMin, max: LIMITS.serieMax },
        // type: decimo
        serie: { type: Number, min: LIMITS.serieMin, max: LIMITS.serieMax },
        fraccion: { type: Number, min: LIMITS.fraccionMin, max: LIMITS.fraccionMax },
        // type: decimos
        items: { type: [serieFraccionSchema], default: undefined },
    },
    { _id: false },
);

const exchangeRowSchema = new mongoose.Schema({
    numero: { type: String, required: true, match: /^\d{5}$/ },
    type: { type: String, enum: ROW_TYPES, required: true },
    quantity: { type: Number, required: true, min: 1 },
    amountDecimos: { type: Number, required: true, min: 1 },
    details: { type: rowDetailsSchema, required: false },
    signed: { type: Boolean, default: false },
    note: { type: String, maxlength: LIMITS.rowNoteMax },
});

const exchangeSchema = new mongoose.Schema(
    {
        campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: EXCHANGE_STATUS, default: 'draft', required: true },
        rows: { type: [exchangeRowSchema], default: [] },
        totalDecimos: { type: Number, default: 0 },
        /** The reverse exchange (to → from) of the same campaign, when it exists. */
        counterpart: { type: mongoose.Schema.Types.ObjectId, ref: 'Exchange' },
        sentAt: { type: Date },
        seenByReceiverAt: { type: Date },
        respondedAt: { type: Date },
        rejectReason: { type: String, maxlength: LIMITS.rejectReasonMax },
        note: { type: String, maxlength: LIMITS.noteMax },
    },
    { timestamps: true, collection: 'exchanges' },
);

// One envelope per direction per campaign.
exchangeSchema.index({ campaign: 1, from: 1, to: 1 }, { unique: true });
exchangeSchema.index({ campaign: 1, to: 1, status: 1 });
exchangeSchema.index({ campaign: 1, from: 1, status: 1 });

/** Amounts are always derived server-side; values sent by the client are ignored. */
exchangeSchema.pre('validate', function () {
    for (const row of this.rows) {
        row.amountDecimos = rowAmountDecimos({ type: row.type, quantity: row.quantity });
    }
    this.totalDecimos = exchangeTotalDecimos(this.rows.map((r) => ({ type: r.type, quantity: r.quantity })));
});

export type ExchangeSchemaType = InferSchemaType<typeof exchangeSchema>;
export type ExchangeDocument = HydratedDocument<ExchangeSchemaType>;
export type ExchangeRowSubdocument = ExchangeSchemaType['rows'][number];

export const Exchange = mongoose.model('Exchange', exchangeSchema);
