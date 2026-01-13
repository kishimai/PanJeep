import { createContext, useContext, useState } from "react";
import {
    Container,
    Paper,
    Box,
    TextField,
    Button,
    Typography,
    InputAdornment,
    CircularProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import {supabase} from "../src/supabase.jsx";
import {useNavigate} from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // 1. Login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setLoading(false);
            alert(error.message);
            return;
        }

        // 2. Fetch ProfileContext.jsx
        // After successful login
        const { data: sessionData } = await supabase.auth.getSession();

        const { data: profilesData, error: profilesError } = await supabase
            .from("admin_profiles")
            .select("*");

        const { data: profile, error: profileError } = await supabase
            .from("admin_profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

        if (profileError) {
            alert(profileError.message);
            setLoading(false);
            return;
        }

        // 3. Done
        setLoading(false);
        alert("Logged in successfully");
        if (!profileError) {
            setProfile(profile);
            navigate("/dashboard"); // redirect
        }
    };


    return (
        <Container
            maxWidth={false}
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.100",
            }}
        >
            <Paper elevation={6} sx={{ p: 4, width: "100%", maxWidth: 420, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={700} align="center" gutterBottom>
                    eTranspo Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" mb={3}>
                    Sign in to manage routes, vehicles, and analytics
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Email"
                        type="email"
                        placeholder="admin@etranspo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mt: 1 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
                    </Button>
                </Box>

                <Typography variant="caption" color="text.secondary" align="center" display="block" mt={3}>
                    Authorized LGUs and operators only
                </Typography>
            </Paper>
        </Container>
    );
}
