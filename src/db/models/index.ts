import 'server-only';

/**
 * Central model registry.
 * Importing this file guarantees every Mongoose model is registered before a
 * query with `populate()` runs (otherwise Mongoose throws MissingSchemaError).
 */
export * from './shared/base';
export * from './user.model';
export * from './role.model';
export * from './geo.model';
export * from './course.model';
export * from './college.model';
export * from './exam.model';
export * from './predictor.model';
export * from './finance.model';
export * from './counselling.model';
export * from './lead.model';
export * from './content.model';
export * from './site.model';
export * from './system.model';
