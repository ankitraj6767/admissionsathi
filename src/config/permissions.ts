/**
 * Granular permission catalogue + default role → permission mapping.
 * Roles are stored in MongoDB (editable by Super Admin) but seeded from this file
 * so that a fresh install already has a working authorization matrix.
 */

export const PERMISSIONS = [
    // colleges
    'college.read',
    'college.create',
    'college.update',
    'college.publish',
    'college.delete',
    // courses & taxonomy
    'course.read',
    'course.manage',
    'specialization.manage',
    // exams
    'exam.read',
    'exam.manage',
    // predictors & datasets
    'predictor.read',
    'predictor.manage',
    'cutoff.import',
    'cutoff.publish',
    // rankings
    'ranking.manage',
    // counselling
    'counselling.read',
    'counselling.manage',
    'counsellor.manage',
    // leads
    'lead.read',
    'lead.create',
    'lead.update',
    'lead.assign',
    'lead.export',
    'lead.delete',
    // finance
    'loan.manage',
    'scholarship.manage',
    // content
    'article.read',
    'article.create',
    'article.update',
    'article.publish',
    'article.delete',
    'news.manage',
    'resource.manage',
    'review.moderate',
    // media
    'media.read',
    'media.manage',
    // site structure
    'navigation.manage',
    'homepage.manage',
    'page.manage',
    'form.manage',
    'redirect.manage',
    'seo.manage',
    // comms
    'notification.manage',
    'template.manage',
    // platform
    'settings.manage',
    'users.read',
    'users.manage',
    'roles.manage',
    'analytics.view',
    'audit.view',
    'integration.manage',
    'ai.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
    'super_admin',
    'admin',
    'content_manager',
    'content_editor',
    'college_manager',
    'exam_manager',
    'predictor_manager',
    'counsellor',
    'lead_manager',
    'finance_manager',
    'support_agent',
    'analyst',
    'student',
] as const;

export type RoleKey = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    content_manager: 'Content Manager',
    content_editor: 'Content Editor',
    college_manager: 'College Manager',
    exam_manager: 'Exam Manager',
    predictor_manager: 'Predictor Manager',
    counsellor: 'Counsellor',
    lead_manager: 'Lead Manager',
    finance_manager: 'Finance Manager',
    support_agent: 'Support Agent',
    analyst: 'Analyst',
    student: 'Student / User',
};

const contentRead: Permission[] = [
    'college.read',
    'course.read',
    'exam.read',
    'article.read',
    'media.read',
];

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
    super_admin: [...PERMISSIONS],
    admin: PERMISSIONS.filter((p) => p !== 'roles.manage' && p !== 'integration.manage'),
    content_manager: [
        ...contentRead,
        'article.create',
        'article.update',
        'article.publish',
        'article.delete',
        'news.manage',
        'resource.manage',
        'review.moderate',
        'media.manage',
        'seo.manage',
        'homepage.manage',
        'page.manage',
        'analytics.view',
    ],
    content_editor: [...contentRead, 'article.create', 'article.update', 'media.manage'],
    college_manager: [
        ...contentRead,
        'college.create',
        'college.update',
        'college.publish',
        'ranking.manage',
        'media.manage',
        'review.moderate',
        'analytics.view',
    ],
    exam_manager: [...contentRead, 'exam.manage', 'resource.manage', 'media.manage', 'analytics.view'],
    predictor_manager: [
        ...contentRead,
        'predictor.read',
        'predictor.manage',
        'cutoff.import',
        'cutoff.publish',
        'analytics.view',
    ],
    counsellor: [
        ...contentRead,
        'counselling.read',
        'counselling.manage',
        'lead.read',
        'lead.update',
        'predictor.read',
    ],
    lead_manager: [
        ...contentRead,
        'lead.read',
        'lead.create',
        'lead.update',
        'lead.assign',
        'lead.export',
        'counselling.read',
        'counselling.manage',
        'counsellor.manage',
        'analytics.view',
    ],
    finance_manager: [...contentRead, 'loan.manage', 'scholarship.manage', 'analytics.view'],
    support_agent: [...contentRead, 'lead.read', 'lead.update', 'counselling.read'],
    analyst: [...contentRead, 'analytics.view', 'predictor.read', 'lead.read'],
    student: [],
};

/** Roles allowed to open /admin at all. */
export const STAFF_ROLES: RoleKey[] = ROLES.filter((r) => r !== 'student');

export function isStaffRole(role: string): role is RoleKey {
    return (STAFF_ROLES as string[]).includes(role);
}

export function permissionsForRoles(roles: string[]): Permission[] {
    const set = new Set<Permission>();
    for (const role of roles) {
        const perms = ROLE_PERMISSIONS[role as RoleKey];
        if (perms) perms.forEach((p) => set.add(p));
    }
    return Array.from(set);
}

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
    {
        label: 'Colleges',
        permissions: ['college.read', 'college.create', 'college.update', 'college.publish', 'college.delete'],
    },
    { label: 'Courses', permissions: ['course.read', 'course.manage', 'specialization.manage'] },
    { label: 'Exams', permissions: ['exam.read', 'exam.manage'] },
    {
        label: 'Predictors',
        permissions: ['predictor.read', 'predictor.manage', 'cutoff.import', 'cutoff.publish', 'ranking.manage'],
    },
    {
        label: 'Counselling & Leads',
        permissions: [
            'counselling.read',
            'counselling.manage',
            'counsellor.manage',
            'lead.read',
            'lead.create',
            'lead.update',
            'lead.assign',
            'lead.export',
            'lead.delete',
        ],
    },
    { label: 'Finance', permissions: ['loan.manage', 'scholarship.manage'] },
    {
        label: 'Content',
        permissions: [
            'article.read',
            'article.create',
            'article.update',
            'article.publish',
            'article.delete',
            'news.manage',
            'resource.manage',
            'review.moderate',
            'media.read',
            'media.manage',
        ],
    },
    {
        label: 'Site structure',
        permissions: ['navigation.manage', 'homepage.manage', 'form.manage', 'redirect.manage', 'seo.manage'],
    },
    { label: 'Communication', permissions: ['notification.manage', 'template.manage', 'ai.manage'] },
    {
        label: 'Platform',
        permissions: [
            'settings.manage',
            'users.read',
            'users.manage',
            'roles.manage',
            'analytics.view',
            'audit.view',
            'integration.manage',
        ],
    },
];
