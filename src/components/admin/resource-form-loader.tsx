import { ResourceForm } from './resource-form';
import { getReferenceOptions } from '@/services/admin/crud.service';
import type { AdminResource } from '@/config/admin-resources';

/**
 * Server wrapper that loads reference-picker options before rendering the
 * client form, so the form never has to fetch on mount.
 */
export async function ResourceFormLoader({
  resource,
  mode,
  docId,
  initialValues,
  publicUrl,
  canDelete,
}: {
  resource: AdminResource;
  mode: 'create' | 'edit';
  docId?: string;
  initialValues: Record<string, unknown>;
  publicUrl?: string;
  canDelete: boolean;
}) {
  const referenceFields = resource.fields.filter((field) => field.type === 'reference' && field.refModel);

  const entries = await Promise.all(
    referenceFields.map(async (field) => {
      const options = await getReferenceOptions(field.refModel!, field.refLabelField ?? 'name');
      return [field.name, options] as const;
    }),
  );

  return (
    <ResourceForm
      resource={{
        key: resource.key,
        label: resource.label,
        labelSingular: resource.labelSingular,
        fields: resource.fields,
        titleField: resource.titleField,
        slugField: resource.slugField,
      }}
      mode={mode}
      docId={docId}
      initialValues={initialValues}
      referenceOptions={Object.fromEntries(entries)}
      publicUrl={publicUrl}
      canDelete={canDelete}
    />
  );
}
