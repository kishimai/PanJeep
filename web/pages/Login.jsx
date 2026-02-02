import { useState } from "react";
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
import { supabase } from "../src/supabase.jsx";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [identifier, setIdentifier] = useState(""); // email or staff ID
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let emailToUse = identifier.trim();

            // 1️⃣ Check if input is staff ID (does not contain @)
            if (!emailToUse.includes("@")) {
                const { data: userRecord, error: userError } = await supabase
                    .from("users")
                    .select("email")
                    .eq("staff_id", emailToUse)
                    .maybeSingle();

                if (userError || !userRecord) {
                    alert("Staff ID not found");
                    setLoading(false);
                    return;
                }

                emailToUse = userRecord.email;
            }

            // 2️⃣ Authenticate via Supabase
            const { data: authData, error: authError } =
                await supabase.auth.signInWithPassword({
                    email: emailToUse,
                    password,
                });

            if (authError || !authData.user) {
                alert(authError?.message || "Login failed");
                setLoading(false);
                return;
            }

            const userId = authData.user.id;

            // 3️⃣ Fetch base user (role gate)
            const { data: userData, error: userError2 } = await supabase
                .from("users")
                .select("id, role, email")
                .eq("id", userId)
                .maybeSingle();

            if (userError2 || !userData) {
                alert("User record not found");
                setLoading(false);
                return;
            }

            if (!["administration", "operator"].includes(userData.role)) {
                alert("Access denied");
                setLoading(false);
                return;
            }

            // 4️⃣ Fetch role profile (PK-as-FK)
            const roleTable =
                userData.role === "administration" ? "administration" : "operators";

            const { data: roleProfile, error: roleError } = await supabase
                .from(roleTable)
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (roleError || !roleProfile) {
                alert("Role profile not found");
                setLoading(false);
                return;
            }

            // 5️⃣ Success
            setLoading(false);
            navigate("/dashboard");

        } catch (err) {
            console.error(err);
            alert("Unexpected error occurred");
            setLoading(false);
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
                    Authorized LGUs and operators only
                </Typography>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                    <TextField
                        label="Email or Staff ID"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailIcon />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : "Sign In"}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
