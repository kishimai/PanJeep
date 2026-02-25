import './App.css';
import Login from '../pages/Login.jsx';
import Map from './Map.jsx';
import { Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material';
import { Dashboard } from '../pages/Dashboard.jsx';
import { useProfile } from './ProfileContext'; // adjust path if needed

const theme = createTheme({
    palette: {
        primary: { main: '#ffffff' },
        secondary: { main: '#c7c7c7' },
        text: { main: '#ffffff' },
    },
});

// Protected route – only accessible when logged in
const ProtectedRoute = ({ children }) => {
    const { user, authLoading } = useProfile();
    if (authLoading) return <div>Loading...</div>;
    return user ? children : <Navigate to="/" replace />;
};

// Public route – redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
    const { user, authLoading } = useProfile();
    if (authLoading) return <div>Loading...</div>;
    return !user ? children : <Navigate to="/dashboard" replace />;
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <Routes>
                <Route
                    path="/"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />
                <Route path="/map" element={<Map />} /> {/* public */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </ThemeProvider>
    );
}

export default App;