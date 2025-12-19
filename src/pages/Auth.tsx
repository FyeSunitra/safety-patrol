import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signIn } = useAuth();
    const [loading, setLoading] = useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    // Login form state
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        if (user) {
            const from = location.state?.from || "/form";
            navigate(from);
        }
    }, [user, navigate, location]);

    useEffect(() => {
        const checkUser = async () => {
            const { data } = await supabase.auth.getUser();
            setIsLoggedIn(!!data.user);
            setAuthReady(true);
        };

        checkUser();

        const { data } = supabase.auth.onAuthStateChange((_e, session) => {
            setIsLoggedIn(!!session?.user);
        });

        return () => data.subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Check fixed credentials
        if (username === "Occ04" && password === "00000000") {
            // Use email format for Supabase Auth
            const email = "occhealth04@system.local";
            const success = await signIn(email, password);

            setLoading(false);

            if (success) {
                navigate("/");
            }
        } else {
            setLoading(false);
            const { toast } = await import("sonner");
            toast.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="gradient-header py-6 px-4">
                <div className="container mx-auto flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/20">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-primary-foreground">รายการตรวจ</h1>
                        <p className="text-primary-foreground/80 text-sm">เข้าสู่ระบบสำหรับนักอาชีวอนามัย</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-4 mt-8">
                <Card className="w-full max-w-md shadow-lg border-2 border-primary/20">
                    <CardHeader className="text-center space-y-2">
                        <div className="flex justify-center mb-2">
                            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                                <Shield className="h-8 w-8 text-primary-foreground" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-foreground">Safety Patrol</CardTitle>
                        <CardDescription>กรุณาเข้าสู่ระบบเพื่อบันทึกรายการตรวจ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
                                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Auth;
