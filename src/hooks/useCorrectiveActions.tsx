import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CorrectiveActionData {
    id: string;
    inspection_id: string;
    item_id: string;
    building: string;
    division: string;
    department: string | null;
    category: string;
    item_name: string;
    responsible: string;
    status: "กำลังตรวจสอบ" | "ดำเนินการแก้ไข" | "แก้ไขเสร็จสิ้น";
    // Inspector fields
    inspection_details: string | null;
    inspection_recommendations: string | null;
    inspection_images: string[];
    // Responsible party fields
    action_details: string | null;
    action_date: string | null;
    action_by: string | null;
    action_images: string[];
    is_new: boolean;
    created_at: string;
    updated_at: string;
}

export const useCorrectiveActions = () => {
    const [actions, setActions] = useState<CorrectiveActionData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("corrective_actions")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const transformedData: CorrectiveActionData[] = (data || []).map(
                (item: any) => ({
                    ...item,
                    inspection_images: Array.isArray(item.inspection_images)
                        ? item.inspection_images
                        : [],
                    action_images: Array.isArray(item.action_images)
                        ? item.action_images
                        : [],
                    is_new: item.is_new ?? true,
                })
            );

            setActions(transformedData);
        } catch (error) {
            console.error("Error fetching corrective actions:", error);
            toast.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    const updateAction = async (
        id: string,
        updates: {
            status?: "กำลังตรวจสอบ" | "ดำเนินการแก้ไข" | "แก้ไขเสร็จสิ้น";
            action_details?: string;
            action_date?: string;
            action_by?: string;
            action_images?: string[];
        }
    ) => {
        try {
            const { error } = await supabase
                .from("corrective_actions")
                .update({
                    ...updates,
                    is_new: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id);

            if (error) throw error;

            toast.success("บันทึกข้อมูลสำเร็จ");
            return true;
        } catch (error) {
            console.error("Error updating corrective action:", error);
            toast.error("ไม่สามารถบันทึกข้อมูลได้");
            return false;
        }
    };

    useEffect(() => {
        fetchActions();

        // subscribe realtime แบบถูกต้อง
        const channel = supabase
            .channel("corrective-actions-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "corrective_actions",
                },
                (payload) => {
                    console.log("INSERT detected:", payload);
                    fetchActions();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "corrective_actions",
                },
                (payload) => {
                    console.log("UPDATE detected:", payload);
                    fetchActions();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "corrective_actions",
                },
                (payload) => {
                    console.log("DELETE detected:", payload);
                    fetchActions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { actions, loading, fetchActions, updateAction };
};
