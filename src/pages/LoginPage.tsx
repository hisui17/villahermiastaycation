import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../context/FirebaseAuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Sun, Moon } from "lucide-react";
import villaLogo from "@/assets/villa-logo.jpg";

const LoginPage = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const { signIn, signUp } = useFirebaseAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isRegister) {
            if (password !== confirmPassword) {
                toast({ title: "Passwords do not match", description: "Please make sure both passwords are the same.", variant: "destructive" });
                return;
            }
            if (password.length < 6) {
                toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
                return;
            }
            if (!fullName.trim()) {
                toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
                return;
            }
        }

        setLoading(true);

        try {
            if (isRegister) {
                await signUp(email, password, fullName);
                toast({ title: "Registration successful", description: "Account created successfully." });
                setIsRegister(false);
                setPassword("");
                setConfirmPassword("");
            } else {
                await signIn(email, password);
                navigate("/dashboard");
            }
        } catch (err: any) {
            toast({
                title: isRegister ? "Registration failed" : "Login failed",
                description: err?.message || "An error occurred.",
                variant: "destructive",
            });
        }

        setLoading(false);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
            <div className="absolute right-4 top-4 flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                <Moon className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <img src={villaLogo} alt="VillaHermia Logo" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
                    <h1 className="text-2xl font-bold">VillaHermia</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Staycation Management System</p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-card">
                    <h2 className="mb-4 text-center text-lg font-semibold">
                        {isRegister ? "Create Account" : "Admin Login"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Gmail Account</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>

                        {isRegister && (
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (isRegister ? "Creating account..." : "Signing in...") : (isRegister ? "Create Account" : "Sign In")}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => { setIsRegister(!isRegister); setPassword(""); setConfirmPassword(""); }}
                            className="text-sm text-primary hover:underline"
                        >
                            {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} VillaHermia Staycation.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
