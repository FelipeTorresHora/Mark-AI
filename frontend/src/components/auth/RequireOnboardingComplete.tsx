import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { isOnboardingComplete } from '../../lib/onboarding';

/** Redirects to onboarding until the user finishes the post-register flow. */
export function RequireOnboardingComplete() {
    const userId = useAppStore((s) => s.user?.id);
    const location = useLocation();

    if (!isOnboardingComplete(userId)) {
        return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
}
