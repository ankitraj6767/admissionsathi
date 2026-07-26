import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { PERMISSIONS } from '@/config/permissions';
import { auditPlugin, baseSchemaOptions, registerModel } from './shared/base';

export interface PermissionDoc {
    _id: Types.ObjectId;
    key: string;
    group: string;
    label: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const permissionSchema = new Schema<PermissionDoc>(
    {
        key: { type: String, required: true, unique: true, trim: true, enum: PERMISSIONS },
        group: { type: String, required: true, trim: true, index: true },
        label: { type: String, required: true, trim: true },
        description: { type: String, trim: true, maxlength: 400 },
    },
    baseSchemaOptions,
);

export const Permission = registerModel<PermissionDoc, Model<PermissionDoc>>(
    'Permission',
    permissionSchema,
);

export interface RoleDoc {
    _id: Types.ObjectId;
    key: string;
    name: string;
    description?: string;
    permissions: string[];
    isSystem: boolean;
    isStaff: boolean;
    adminMenuKeys: string[];
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new Schema<RoleDoc>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: /^[a-z0-9_]+$/,
        },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        description: { type: String, trim: true, maxlength: 400 },
        permissions: { type: [String], default: [] },
        isSystem: { type: Boolean, default: false },
        isStaff: { type: Boolean, default: true, index: true },
        adminMenuKeys: { type: [String], default: [] },
    },
    baseSchemaOptions,
);

roleSchema.plugin(auditPlugin);

export const Role = registerModel<RoleDoc, Model<RoleDoc>>('Role', roleSchema);
