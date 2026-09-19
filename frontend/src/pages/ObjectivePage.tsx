import { useLocation } from 'react-router-dom';
import { ObjectiveComposer } from '../components/campaign/ObjectiveComposer';

export function ObjectivePage() {
    const location = useLocation();
    const navState = location.state as { topic?: string; objective?: string; nonce?: number } | null;
    const initialObjective = navState?.objective ?? navState?.topic ?? '';

    return (
        <div className="max-w-5xl mx-auto py-8 md:py-12 w-full px-1">
            <ObjectiveComposer key={`${location.key}-${navState?.nonce ?? 0}`} initialObjective={initialObjective} />
        </div>
    );
}
