import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // Check if user is admin
                    setTimeout(async () => {
                        const { data } = await supabase
                            .from('user_roles')
                            .select('role')
                            .eq('user_id', session.user.id)
                            .eq('role', 'admin')
                            .maybeSingle();

                        setIsAdmin(!!data);
                    }, 0);
                } else {
                    setIsAdmin(false);
                }
            }
        );

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (session?.user) {
                // Check if user is admin
                setTimeout(async () => {
                    const { data } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', session.user.id)
                        .eq('role', 'admin')
                        .maybeSingle();

                    setIsAdmin(!!data);
                }, 0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
            return false;
        }

        toast.success("เข้าสู่ระบบสำเร็จ");
        return true;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            toast.error("ออกจากระบบไม่สำเร็จ: " + error.message);
            return;
        }

        toast.success("ออกจากระบบสำเร็จ");
        navigate("/auth");
    };

    return {
        user,
        session,
        loading,
        isAdmin,
        signIn,
        signOut,
    };
};
