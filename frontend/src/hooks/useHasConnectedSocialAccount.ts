import { useSocialAccounts } from './useSocialAccounts';
import { useXIntegrationStatus } from './useXIntegration';

export function useHasConnectedSocialAccount(): boolean {
    const { data: accounts = [] } = useSocialAccounts();
    const { data: xStatus } = useXIntegrationStatus();
    return !!xStatus?.connected || accounts.length > 0;
}
