import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InspectionRecord } from "@/types/inspection";
import { toast } from "sonner";

export const useInspections = () => {
    const [inspections, setInspections] = useState<InspectionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadInspections = async () => {
        try {
            const { data, error } = await supabase
                .from("inspections")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Transform database records to InspectionRecord format
            const transformedData: InspectionRecord[] = (data || []).map((record) => ({
                id: record.id,
                date: record.date,
                time: record.time || "",
                building: record.building,
                floor: "",
                division: record.division,
                department: record.department,
                inspectorName: record.inspector_name,
                surveyTeam: [],
                items: record.items as any[],
                createdAt: record.created_at,
                updatedAt: record.updated_at,
            }));

            setInspections(transformedData);
        } catch (error: any) {
            console.error("Error loading inspections:", error);
            toast.error("ไม่สามารถโหลดข้อมูลการตรวจได้");
        } finally {
            setLoading(false);
        }
    };

    const saveInspection = async (inspection: InspectionRecord) => {
        try {
            const { data: user } = await supabase.auth.getUser();

            const { error } = await supabase.from("inspections").upsert([{
                id: inspection.id,
                user_id: user.user?.id,
                date: inspection.date,
                time: inspection.time || new Date().toLocaleTimeString('th-TH'),
                building: inspection.building,
                division: inspection.division,
                department: inspection.department,
                inspector_name: inspection.inspectorName || '',
                items: inspection.items as any,
            }]);

            if (error) throw error;

            // Create corrective actions for abnormal items
            const abnormalItems = inspection.items.filter(
                (item) => item.status === "abnormal"
            );

            if (abnormalItems.length > 0) {
                for (const item of abnormalItems) {
                    const { error: correctiveError } = await supabase.from("corrective_actions").upsert({
                        id: `${inspection.id}-${item.id}`,
                        inspection_id: inspection.id,
                        item_id: item.id,
                        building: inspection.building,
                        division: inspection.division,
                        department: inspection.department,
                        category: item.category,
                        item_name: item.name,
                        responsible: item.responsible || "ไม่ระบุ",
                        status: "กำลังตรวจสอบ",
                        is_new: true,
                    });

                    if (correctiveError) {
                        console.error("Error creating corrective action:", correctiveError);
                        toast.error(`ไม่สามารถสร้างรายการติดตามแก้ไขสำหรับ: ${item.name}`);
                    }
                }

                toast.info(`พบ ${abnormalItems.length} รายการผิดปกติ ส่งไปติดตามแก้ไขแล้ว`);
            }

            toast.success("บันทึกการตรวจสำเร็จ");
            await loadInspections();
        } catch (error: any) {
            console.error("Error saving inspection:", error);
            toast.error("ไม่สามารถบันทึกการตรวจได้");
        }
    };

    const deleteInspection = async (id: string) => {
        try {
            const { error } = await supabase
                .from("inspections")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("ลบการตรวจสำเร็จ");
            await loadInspections();
        } catch (error: any) {
            console.error("Error deleting inspection:", error);
            toast.error("ไม่สามารถลบการตรวจได้");
        }
    };

    useEffect(() => {
        loadInspections();

        // Subscribe to realtime changes
        const channel = supabase
            .channel("inspections-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "inspections",
                },
                () => {
                    loadInspections();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        inspections,
        loading,
        saveInspection,
        deleteInspection,
        refreshInspections: loadInspections,
    };
};
