import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InspectionRecord } from "@/types/inspection";
import { DIVISIONS } from "@/data/divisions";
import { generatePDF } from "@/lib/pdfGenerator";

const ReportDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inspection, setInspection] = useState<InspectionRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) {
            navigate("/reports");
            return;
        }

        const loadInspection = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("inspections")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error || !data) {
                    console.error("Error loading inspection:", error);
                    navigate("/reports");
                    return;
                }

                const transformed: InspectionRecord = {
                    id: data.id,
                    date: data.date,
                    time: data.time || "",
                    building: data.building,
                    floor: data.floor || "",
                    division: data.division,
                    department: data.department,
                    inspectorName: data.inspector_name,
                    surveyTeam: data.inspector_name
                        ? data.inspector_name.split(", ")
                        : [],
                    items: Array.isArray(data.items) ? data.items : [],
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                };

                setInspection(transformed);
            } catch (err) {
                console.error(err);
                navigate("/reports");
            } finally {
                setLoading(false);
            }
        };

        loadInspection();
    }, [id, navigate]);

    const handleDownloadPDF = () => {
        if (!inspection) return;

        const division = DIVISIONS.find((d) => d.id === inspection.division);
        const department = division?.departments.find(
            (dept) => dept.id === inspection.department
        );

        // ถ้า generatePDF รองรับ element เอา contentRef.current ส่งเพิ่มได้
        generatePDF(inspection, division?.name, department?.name);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
        );
    }

    if (!inspection) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">
                    ไม่พบข้อมูลการตรวจที่เลือก
                </p>
            </div>
        );
    }

    const division = DIVISIONS.find((d) => d.id === inspection.division);
    const department = division?.departments.find(
        (dept) => dept.id === inspection.department
    );
    const abnormalItems = inspection.items.filter(
        (item) => item.status === "abnormal"
    );
    const normalItems = inspection.items.filter(
        (item) => item.status === "normal"
    );
    const notRelevantItems = inspection.items.filter(
        (item) => item.status === "not_relevant"
    );

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center justify-between">
                    <Button variant="outline" onClick={() => navigate("/reports")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        กลับ
                    </Button>
                    <Button onClick={handleDownloadPDF}>
                        <Download className="mr-2 h-4 w-4" />
                        ดาวน์โหลด PDF
                    </Button>
                </div>

                <div ref={contentRef}>
                    <Card className="mb-6 p-6">
                        <h1 className="mb-4 text-center text-2xl font-bold text-foreground">
                            สรุปผลแบบสำรวจความปลอดภัยในการทำงาน (Safety Patrol)
                        </h1>

                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium">หน่วยงาน:</span>{" "}
                                    {division?.name || inspection.division}
                                    {department && ` - ${department.name}`}
                                </div>
                                <div>
                                    <span className="font-medium">อาคาร:</span>{" "}
                                    {inspection.building} (ชั้น {inspection.floor || "-"})
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium">วันที่สำรวจ:</span>{" "}
                                    {inspection.date}
                                </div>
                                <div>
                                    <span className="font-medium">คณะผู้สำรวจ:</span>{" "}
                                    {inspection.surveyTeam.join(", ")}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="mb-6 p-6">
                        <h2 className="mb-4 text-xl font-bold text-foreground">
                            สรุปผลการตรวจ
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg bg-success/10 p-4 text-center">
                                <p className="text-3xl font-bold text-success">
                                    {normalItems.length}
                                </p>
                                <p className="text-sm text-muted-foreground">ปกติ</p>
                            </div>
                            <div className="rounded-lg bg-destructive/10 p-4 text-center">
                                <p className="text-3xl font-bold text-destructive">
                                    {abnormalItems.length}
                                </p>
                                <p className="text-sm text-muted-foreground">ไม่ปกติ</p>
                            </div>
                            <div className="rounded-lg bg-muted p-4 text-center">
                                <p className="text-3xl font-bold text-foreground">
                                    {notRelevantItems.length}
                                </p>
                                <p className="text-sm text-muted-foreground">ไม่เกี่ยวข้อง</p>
                            </div>
                        </div>
                    </Card>

                    {abnormalItems.length > 0 && (
                        <Card className="mb-6 p-6">
                            <h2 className="mb-4 text-xl font-bold text-destructive">
                                รายการที่พบปัญหา
                            </h2>
                            <div className="space-y-6">
                                {abnormalItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="rounded-lg border border-destructive/20 p-4"
                                    >
                                        <div className="mb-2 flex items-start justify-between">
                                            <h3 className="flex-1 font-medium text-foreground">
                                                {index + 1}. {item.name}
                                            </h3>
                                            <span className="ml-2 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
                                                {item.category}
                                            </span>
                                        </div>

                                        {item.details && (
                                            <div className="mb-3">
                                                <p className="mb-1 text-sm font-medium text-foreground">
                                                    รายละเอียด:
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.details}
                                                </p>
                                            </div>
                                        )}

                                        {item.images && item.images.length > 0 && (
                                            <div className="mb-3">
                                                <p className="mb-2 text-sm font-medium text-foreground">
                                                    รูปภาพ:
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                    {item.images.map((img, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={img}
                                                            alt={`รูปที่ ${idx + 1}`}
                                                            className="h-32 w-full rounded object-cover"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {item.recommendations && (
                                            <div className="mb-3">
                                                <p className="mb-1 text-sm font-medium text-foreground">
                                                    ข้อเสนอแนะ/การแก้ไข:
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.recommendations}
                                                </p>
                                            </div>
                                        )}

                                        {item.responsible && (
                                            <div>
                                                <p className="mb-1 text-sm font-medium text-foreground">
                                                    ผู้รับผิดชอบ:
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.responsible}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card className="p-6">
                        <h2 className="mb-4 text-xl font-bold text-foreground">
                            รายการตรวจทั้งหมด
                        </h2>
                        <div className="space-y-3">
                            {(() => {
                                const groupedByCategory = inspection.items.reduce(
                                    (acc, item) => {
                                        if (!acc[item.category]) {
                                            acc[item.category] = {
                                                normal: [],
                                                abnormal: [],
                                                not_relevant: [],
                                            };
                                        }
                                        if (item.status === "normal") {
                                            acc[item.category].normal.push(item);
                                        } else if (item.status === "abnormal") {
                                            acc[item.category].abnormal.push(item);
                                        } else {
                                            acc[item.category].not_relevant.push(item);
                                        }
                                        return acc;
                                    },
                                    {} as Record<
                                        string,
                                        {
                                            normal: typeof inspection.items;
                                            abnormal: typeof inspection.items;
                                            not_relevant: typeof inspection.items;
                                        }
                                    >
                                );

                                return Object.entries(groupedByCategory).map(
                                    ([category, items]) => (
                                        <div key={category} className="rounded-lg border p-3">
                                            <h3 className="mb-2 font-semibold text-foreground">
                                                {category}
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                {items.normal.length > 0 && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                                                            ปกติ
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            ({items.normal.length} รายการ)
                                                        </span>
                                                    </div>
                                                )}
                                                {items.abnormal.length > 0 && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-start gap-2">
                                                            <span className="inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                                                                ไม่ปกติ
                                                            </span>
                                                            <span className="font-medium text-destructive">
                                                                ({items.abnormal.length} รายการ)
                                                            </span>
                                                        </div>
                                                        <ul className="ml-4 list-disc space-y-1">
                                                            {items.abnormal.map((item) => (
                                                                <li
                                                                    key={item.id}
                                                                    className="text-muted-foreground"
                                                                >
                                                                    {item.name}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {items.not_relevant.length > 0 && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                            ไม่เกี่ยวข้อง
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            ({items.not_relevant.length} รายการ)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                );
                            })()}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ReportDetail;
