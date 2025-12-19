import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, BarChart3, FileCheck, LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authReady, setAuthReady] = useState(false);

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    if (!authReady) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header with gradient */}
            <div className="gradient-header py-8 px-4">
                <div className="container mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="bg-primary-foreground/20 rounded-lg p-2">
                            <ClipboardList className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                            Safety Patrol
                        </h1>
                    </div>
                    <p className="text-primary-foreground/90 text-sm md:text-base">
                        ระบบบันทึกการสำรวจความปลอดภัยในการทำงาน
                    </p>

                    {!isLoggedIn && (
                        <p className="mt-2 text-xs md:text-sm text-primary-foreground/80">
                            หากต้องการบันทึก/จัดการรายการตรวจ โปรดเข้าสู่ระบบก่อน
                        </p>
                    )}
                </div>
            </div>

            {/* Navigation Cards */}
            <div className="container mx-auto p-4 -mt-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {/* หากยังไม่ล็อกอิน -> แสดงการ์ด "เข้าสู่ระบบ" */}
                    {!isLoggedIn ? (
                        <Card
                            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-primary/20 hover:border-primary bg-card group"
                            onClick={() => navigate("/auth")}
                        >
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <LogIn className="h-8 w-8 text-primary-foreground" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    เข้าสู่ระบบ
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    สำหรับนักอาชีวอนามัย เพื่อบันทึกและจัดการรายการตรวจ
                                </p>
                                <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                    คลิกเพื่อเข้าสู่ระบบ
                                </span>
                            </CardContent>
                        </Card>

                    ) : (
                        /* ถ้าล็อกอินแล้ว -> แสดง "รายการตรวจ" */
                        <Card
                            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-primary/20 hover:border-primary bg-card group"
                            onClick={() => navigate("/form")}
                        >
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ClipboardList className="h-8 w-8 text-primary-foreground" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    รายการตรวจ
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    บันทึกการตรวจสอบความปลอดภัย
                                </p>
                                <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                    สำหรับนักอาชีวอนามัย (เข้าสู่ระบบแล้ว)
                                </span>
                            </CardContent>
                        </Card>
                    )}

                    {/* แดชบอร์ด */}
                    <Card
                        className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-secondary/20 hover:border-secondary bg-card group"
                        onClick={() => navigate("/dashboard")}
                    >
                        <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BarChart3 className="h-8 w-8 text-secondary-foreground" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">
                                แดชบอร์ด
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                ดูสถิติและผลการตรวจทั้งหมด
                            </p>
                            <span className="inline-block px-3 py-1 text-xs font-medium bg-secondary/20 text-foreground rounded-full">
                                เปิดให้ทุกคนเข้าถึง
                            </span>
                        </CardContent>
                    </Card>

                    {/* ติดตามแก้ไข */}
                    <Card
                        className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-accent/20 hover:border-accent bg-card group"
                        onClick={() => navigate("/follow-up")}
                    >
                        <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileCheck className="h-8 w-8 text-accent-foreground" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">
                                ติดตามแก้ไข
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                ติดตามสถานะการแก้ไขปัญหา
                            </p>
                            <span className="inline-block px-3 py-1 text-xs font-medium bg-accent/10 text-accent rounded-full">
                                เปิดให้ทุกคนเข้าถึง
                            </span>
                        </CardContent>
                    </Card>

                    {isLoggedIn && (
                        <Card
                            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-destructive/20 hover:border-destructive bg-card group"
                            onClick={handleLogout}
                        >
                            <CardContent className="p-6 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <LogOut className="h-8 w-8 text-destructive" />
                                </div>

                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    ออกจากระบบ
                                </h3>

                                <p className="text-sm text-muted-foreground mb-3">
                                    ออกจากระบบผู้ใช้งานปัจจุบัน
                                </p>

                                <span className="inline-block px-3 py-1 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                                    คลิกเพื่อออกจากระบบ
                                </span>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;
