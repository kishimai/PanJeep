import { createContext, useContext, useState } from "react";

// Create the context
export const ProfileContext = createContext();

// Provider component
export function ProfileProvider({ children }) {
    const [profile, setProfile] = useState(null);
    return (
        <ProfileContext.Provider value={{ profile, setProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

// Hook to use the context easily
export function useProfile() {
    return useContext(ProfileContext);
}
