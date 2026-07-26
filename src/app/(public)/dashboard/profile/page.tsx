import { ProfileForms } from '@/components/dashboard/profile-forms';
import { requireAuthPage } from '@/lib/auth/session';
import { connectToDatabase } from '@/db/connect';
import { User } from '@/db/models/user.model';
import { listStates } from '@/db/repositories/geo.repository';

export default async function ProfilePage() {
    const actor = await requireAuthPage();
    await connectToDatabase();

    const [user, states] = await Promise.all([
        User.findById(actor.id).lean().exec(),
        listStates({ limit: 40 }),
    ]);

    return (
        <ProfileForms
            states={states.map((state) => ({ label: state.name, value: String(state._id) }))}
            defaults={{
                name: user?.name ?? actor.name,
                phone: user?.phone ?? '',
                stateId: user?.profile?.state ? String(user.profile.state) : '',
                cityId: user?.profile?.city ? String(user.profile.city) : '',
                currentQualification: user?.profile?.currentQualification ?? '',
                passingYear: user?.profile?.passingYear,
                gender: user?.profile?.gender ?? '',
                category: user?.profile?.category ?? '',
            }}
            preferences={{
                channels: (user?.notificationPreferences?.channels as ('email' | 'whatsapp' | 'sms' | 'in_app')[]) ?? [
                    'email',
                    'in_app',
                ],
                examAlerts: user?.notificationPreferences?.examAlerts ?? true,
                admissionAlerts: user?.notificationPreferences?.admissionAlerts ?? true,
                savedCollegeUpdates: user?.notificationPreferences?.savedCollegeUpdates ?? true,
                marketing: user?.notificationPreferences?.marketing ?? false,
            }}
        />
    );
}
