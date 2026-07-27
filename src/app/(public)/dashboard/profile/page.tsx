import { ProfileForms } from '@/components/dashboard/profile-forms';
import { requireAuthPage } from '@/lib/auth/session';
import { getProfileScreenData } from '@/services/account.service';
import { listStates } from '@/db/repositories/geo.repository';

export default async function ProfilePage() {
    const actor = await requireAuthPage();

    const [profile, states] = await Promise.all([
        getProfileScreenData(actor.id, actor.name),
        listStates({ limit: 40 }),
    ]);

    return (
        <ProfileForms
            states={states.map((state) => ({ label: state.name, value: String(state._id) }))}
            defaults={{
                name: profile.name,
                phone: profile.phone,
                stateId: profile.stateId,
                cityId: profile.cityId,
                currentQualification: profile.currentQualification,
                passingYear: profile.passingYear,
                gender: profile.gender,
                category: profile.category,
            }}
            preferences={profile.preferences}
        />
    );
}
