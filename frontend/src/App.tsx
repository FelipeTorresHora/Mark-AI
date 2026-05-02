import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { router, AppProvider } from './AppRoutes';

function App() {
    return (
        <ErrorBoundary>
            <AppProvider>
                <RouterProvider router={router} />
            </AppProvider>
        </ErrorBoundary>
    );
}

export default App;
