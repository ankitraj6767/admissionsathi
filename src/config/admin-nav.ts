import type { Permission } from './permissions';

export interface AdminNavItem {
    label: string;
    href: string;
    icon: string;
    permission?: Permission;
    permissionsAny?: Permission[];
    badgeKey?: 'newLeads' | 'pendingReviews' | 'draftContent';
}

export interface AdminNavGroup {
    label: string;
    items: AdminNavItem[];
}

/** Admin sidebar. Items are hidden when the actor lacks the permission — and the
 *  page itself re-checks server-side, so hiding is only a convenience. */
export const ADMIN_NAV: AdminNavGroup[] = [
    {
        label: 'Overview',
        items: [
            { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
            { label: 'Analytics', href: '/admin/analytics', icon: 'BarChart3', permission: 'analytics.view' },
        ],
    },
    {
        label: 'Catalogue',
        items: [
            { label: 'Colleges', href: '/admin/colleges', icon: 'Building2', permission: 'college.read' },
            { label: 'Courses', href: '/admin/courses', icon: 'GraduationCap', permission: 'course.read' },
            { label: 'Course categories', href: '/admin/course-categories', icon: 'LayoutGrid', permission: 'course.manage' },
            { label: 'Specializations', href: '/admin/specializations', icon: 'ListChecks', permission: 'specialization.manage' },
            { label: 'Exams', href: '/admin/exams', icon: 'FileText', permission: 'exam.read' },
            { label: 'Exam dates', href: '/admin/exam-dates', icon: 'CalendarDays', permission: 'exam.manage' },
            { label: 'Rankings', href: '/admin/rankings', icon: 'Trophy', permission: 'ranking.manage' },
            { label: 'States & cities', href: '/admin/states', icon: 'Map', permission: 'settings.manage' },
        ],
    },
    {
        label: 'Predictors',
        items: [
            { label: 'Predictors', href: '/admin/predictors', icon: 'Target', permission: 'predictor.read' },
            { label: 'Cut-off datasets', href: '/admin/cutoff-datasets', icon: 'Database', permission: 'cutoff.import' },
        ],
    },
    {
        label: 'Counselling & CRM',
        items: [
            { label: 'Leads', href: '/admin/leads', icon: 'Users', permission: 'lead.read', badgeKey: 'newLeads' },
            { label: 'Bookings', href: '/admin/counselling', icon: 'CalendarCheck', permission: 'counselling.read' },
            { label: 'Counsellors', href: '/admin/counsellors', icon: 'UserCheck', permission: 'counsellor.manage' },
            { label: 'Contact submissions', href: '/admin/contact-submissions', icon: 'Mail', permission: 'lead.read' },
        ],
    },
    {
        label: 'Finance',
        items: [
            { label: 'Loan providers', href: '/admin/loan-providers', icon: 'Landmark', permission: 'loan.manage' },
            { label: 'Loan products', href: '/admin/loan-products', icon: 'Wallet', permission: 'loan.manage' },
            { label: 'Scholarships', href: '/admin/scholarships', icon: 'Award', permission: 'scholarship.manage' },
        ],
    },
    {
        label: 'Content',
        items: [
            { label: 'Articles', href: '/admin/articles', icon: 'Newspaper', permission: 'article.read', badgeKey: 'draftContent' },
            { label: 'News & updates', href: '/admin/news', icon: 'Megaphone', permission: 'news.manage' },
            { label: 'Resources', href: '/admin/resources', icon: 'FileStack', permission: 'resource.manage' },
            { label: 'FAQs', href: '/admin/faqs', icon: 'CircleHelp', permission: 'resource.manage' },
            { label: 'Reviews', href: '/admin/reviews', icon: 'Star', permission: 'review.moderate', badgeKey: 'pendingReviews' },
            { label: 'Media library', href: '/admin/media', icon: 'Palette', permission: 'media.read' },
        ],
    },
    {
        label: 'Site structure',
        items: [
            { label: 'Homepage builder', href: '/admin/homepage', icon: 'Home', permission: 'homepage.manage' },
            { label: 'Navigation menus', href: '/admin/navigation', icon: 'Link2', permission: 'navigation.manage' },
            { label: 'Forms', href: '/admin/forms', icon: 'ClipboardList', permission: 'form.manage' },
            { label: 'Redirects', href: '/admin/redirects', icon: 'Share2', permission: 'redirect.manage' },
            { label: 'SEO', href: '/admin/seo', icon: 'Globe', permission: 'seo.manage' },
        ],
    },
    {
        label: 'Communication',
        items: [
            { label: 'Notifications', href: '/admin/notifications', icon: 'BellRing', permission: 'notification.manage' },
            { label: 'Email templates', href: '/admin/email-templates', icon: 'Mail', permission: 'template.manage' },
            { label: 'WhatsApp templates', href: '/admin/whatsapp-templates', icon: 'MessageCircle', permission: 'template.manage' },
            { label: 'AI assistant', href: '/admin/ai', icon: 'Sparkles', permission: 'ai.manage' },
        ],
    },
    {
        label: 'Platform',
        items: [
            { label: 'Users', href: '/admin/users', icon: 'Users', permission: 'users.read' },
            { label: 'Roles & permissions', href: '/admin/roles', icon: 'Shield', permission: 'roles.manage' },
            { label: 'Search insights', href: '/admin/search', icon: 'Search', permission: 'analytics.view' },
            { label: 'Audit logs', href: '/admin/audit-logs', icon: 'Eye', permission: 'audit.view' },
            { label: 'Integrations', href: '/admin/integrations', icon: 'Cog', permission: 'integration.manage' },
            { label: 'Settings', href: '/admin/settings', icon: 'Settings', permission: 'settings.manage' },
        ],
    },
];
