import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import {
    auditPlugin,
    baseSchemaOptions,
    registerModel,
    seoSchema,
    slugField,
    statusField,
    type SeoMeta,
} from './shared/base';

export interface StateDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    code: string;
    region?: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East';
    isUnionTerritory: boolean;
    counsellingAuthority?: string;
    counsellingWebsite?: string;
    description?: string;
    collegeCount: number;
    displayOrder: number;
    isFeatured: boolean;
    status: 'active' | 'inactive' | 'archived';
    seo?: SeoMeta;
    createdAt: Date;
    updatedAt: Date;
}

const stateSchema = new Schema<StateDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
        slug: { ...slugField, unique: true },
        code: { type: String, required: true, trim: true, uppercase: true, maxlength: 5 },
        region: { type: String, enum: ['North', 'South', 'East', 'West', 'Central', 'North-East'] },
        isUnionTerritory: { type: Boolean, default: false },
        counsellingAuthority: { type: String, trim: true, maxlength: 200 },
        counsellingWebsite: { type: String, trim: true },
        description: { type: String, trim: true, maxlength: 2000 },
        collegeCount: { type: Number, default: 0, min: 0 },
        displayOrder: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false, index: true },
        status: statusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

stateSchema.plugin(auditPlugin);
stateSchema.index({ name: 'text' });
stateSchema.index({ status: 1, displayOrder: 1 });

export const State = registerModel<StateDoc, Model<StateDoc>>('State', stateSchema);

export interface CityDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    state: Types.ObjectId;
    stateName: string;
    tier?: 1 | 2 | 3;
    isMetro: boolean;
    description?: string;
    collegeCount: number;
    isFeatured: boolean;
    displayOrder: number;
    location?: { type: 'Point'; coordinates: [number, number] };
    status: 'active' | 'inactive' | 'archived';
    seo?: SeoMeta;
    createdAt: Date;
    updatedAt: Date;
}

const citySchema = new Schema<CityDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        slug: { ...slugField, unique: true },
        state: { type: Schema.Types.ObjectId, ref: 'State', required: true, index: true },
        // denormalized for listing cards & filters (avoids a populate on every card)
        stateName: { type: String, required: true, trim: true },
        tier: { type: Number, enum: [1, 2, 3] },
        isMetro: { type: Boolean, default: false },
        description: { type: String, trim: true, maxlength: 2000 },
        collegeCount: { type: Number, default: 0, min: 0 },
        isFeatured: { type: Boolean, default: false, index: true },
        displayOrder: { type: Number, default: 0 },
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] },
        },
        status: statusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

citySchema.plugin(auditPlugin);
citySchema.index({ name: 'text' });
citySchema.index({ state: 1, name: 1 }, { unique: true });
citySchema.index({ status: 1, isFeatured: -1, collegeCount: -1 });

export const City = registerModel<CityDoc, Model<CityDoc>>('City', citySchema);
