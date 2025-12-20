import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DIVISIONS } from "@/data/divisions";
import { generatePDF } from "@/lib/pdfGenerator";
import { InspectionRecord, InspectionItem, InspectionStatus } from "@/types/inspection";

const ReportDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inspection, setInspection] = useState<InspectionRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const [correctiveActions, setCorrectiveActions] = useState<
        {
            item_id: string;
            inspection_images?: string[] | null;
            inspection_details?: string | null;
            inspection_recommendations?: string | null;
        }[]
    >([]);

    useEffect(() => {
        if (!id) {
            navigate("/reports");
            return;
        }

        const loadInspection = async () => {
            setLoading(true);
            try {
                // 1) โหลด inspections ก่อน
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
                    floor: (data as any).floor || "",
                    division: data.division,
                    department: data.department,
                    inspectorName: data.inspector_name,
                    surveyTeam: data.inspector_name ? data.inspector_name.split(", ") : [],
                    items: Array.isArray(data.items)
                        ? (data.items as unknown as InspectionItem[])
                        : [],
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                };

                setInspection(transformed);

                // 2) โหลด corrective_actions ของ inspection นี้
                const { data: caData, error: caError } = await supabase
                    .from("corrective_actions")
                    .select(
                        "item_id, inspection_details, inspection_recommendations, inspection_images"
                    )
                    .eq("inspection_id", data.id);

                if (caError) {
                    console.error("Error loading corrective actions:", caError);
                } else if (caData) {
                    setCorrectiveActions(caData as any);
                }
            } catch (err) {
                console.error(err);
                navigate("/reports");
            } finally {
                setLoading(false);
            }
        };

        loadInspection();
    }, [id, navigate]);


    async function downloadAllImages(images: string[], prefix: string) {
        for (let i = 0; i < images.length; i++) {
            const url = images[i];
            const res = await fetch(url);
            const blob = await res.blob();

            const ext = blob.type.split("/")[1] || "jpg";

            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${prefix}_image_${i + 1}.${ext}`;
            a.click();

            URL.revokeObjectURL(a.href);
        }
    }

    const handleDownloadPDF = () => {
        if (!inspection) return;

        const division = DIVISIONS.find((d) => d.id === inspection.division);
        const department = division?.departments.find(
            (dept) => dept.id === inspection.department
        );

        // รวมรูปทุกแหล่งของแต่ละ item มายัดลงใน field images
        const itemsWithAllImages = inspection.items.map((item) => ({
            ...item,
            images: getAllImagesForItem(item), // ใช้ helper ที่คุณมีอยู่แล้วด้านบน
        }));

        // สร้าง inspection ใหม่สำหรับใช้ใน PDF
        const inspectionForPdf = {
            ...inspection,
            items: itemsWithAllImages,
        };

        generatePDF(inspectionForPdf as InspectionRecord, division?.name, department?.name);
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
                <p className="text-muted-foreground">ไม่พบข้อมูลการตรวจที่เลือก</p>
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

    function getAllImagesForItem(item: InspectionItem): string[] {
        const baseImages = Array.isArray(item.images) ? item.images : [];

        const ca = correctiveActions.find((c) => c.item_id === item.id);
        const caImages = ca && Array.isArray(ca.inspection_images)
            ? (ca.inspection_images as string[])
            : [];

        // รูปทั้งหมด (จากฟอร์ม + จากบันทึกติดตาม)
        return [...baseImages, ...caImages];
    }

    return (
        <div className="min-h-screen bg-background p-3 md:p-6">
            {/* ใช้ max-w-6xl ให้กว้างขึ้นและกินจอมากกว่าเดิม */}
            <div className="mx-auto max-w-6xl">
                {/* Header + ปุ่มดาวน์โหลด */}
                <div className="mb-4 flex items-center justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate("/reports")}
                        className="shrink-0"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        กลับ
                    </Button>
                    <Button onClick={handleDownloadPDF} className="shrink-0">
                        <Download className="mr-2 h-4 w-4" />
                        ดาวน์โหลด PDF
                    </Button>
                </div>

                <div ref={contentRef} className="space-y-6">
                    {/* หัวรายงาน */}
                    <Card className="p-4 md:p-6">
                        <h1 className="mb-4 text-center text-xl md:text-2xl font-bold text-foreground">
                            สรุปผลแบบสำรวจความปลอดภัยในการทำงาน (Safety Patrol)
                        </h1>

                        <div className="grid gap-3 text-xs md:text-sm md:grid-cols-2">
                            <div className="space-y-1">
                                <div>
                                    <span className="font-medium">หน่วยงานหลัก:</span>{" "}
                                    {division?.name || inspection.division}
                                </div>
                                <div>
                                    <span className="font-medium">หน่วยงานย่อย:</span>{" "}
                                    {department?.name || inspection.department || "-"}
                                </div>
                                <div>
                                    <span className="font-medium">คณะผู้สำรวจ:</span>{" "}
                                    {inspection.surveyTeam.length > 0
                                        ? inspection.surveyTeam.join(", ")
                                        : inspection.inspectorName || "-"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div>
                                    <span className="font-medium">อาคาร:</span>{" "}
                                    {inspection.building}
                                </div>
                                <div>
                                    <span className="font-medium">ชั้น:</span>{" "}
                                    {inspection.floor || "-"}
                                </div>
                                <div>
                                    <span className="font-medium">วันที่สำรวจ:</span>{" "}
                                    {inspection.date}
                                    {inspection.time && ` เวลา ${inspection.time} น.`}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* สรุปจำนวนปกติ / ไม่ปกติ / ไม่เกี่ยวข้อง */}
                    <Card className="p-4 md:p-6">
                        <h2 className="mb-4 text-lg md:text-xl font-bold text-foreground">
                            สรุปผลการตรวจ
                        </h2>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-lg bg-emerald-50 p-4 text-center">
                                <p className="text-2xl md:text-3xl font-bold text-emerald-600">
                                    {normalItems.length}
                                </p>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                    ปกติ
                                </p>
                            </div>
                            <div className="rounded-lg bg-red-50 p-4 text-center">
                                <p className="text-2xl md:text-3xl font-bold text-red-600">
                                    {abnormalItems.length}
                                </p>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                    ไม่ปกติ
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-4 text-center">
                                <p className="text-2xl md:text-3xl font-bold text-slate-700">
                                    {notRelevantItems.length}
                                </p>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                    ไม่เกี่ยวข้อง
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* รายการที่พบปัญหา (การ์ด) */}
                    {abnormalItems.length > 0 && (
                        <Card className="p-4 md:p-6 border-red-100 bg-red-50/40">
                            <h2 className="mb-4 text-lg md:text-xl font-bold text-red-600">
                                รายการที่พบปัญหา
                            </h2>
                            <div className="space-y-4">
                                {abnormalItems.map((item, index) => {
                                    const allImages = getAllImagesForItem(item);

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-red-100 bg-background p-3 md:p-4"
                                        >
                                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {index + 1}. {item.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        หมวดหมู่: {item.category}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {allImages.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                downloadAllImages(allImages, item.id)
                                                            }
                                                            className="flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs hover:bg-muted"
                                                        >
                                                            ดาวน์โหลดรูปทั้งหมด
                                                        </button>
                                                    )}

                                                    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                                                        ไม่ปกติ
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 text-xs md:text-sm md:grid-cols-2">
                                                <div className="space-y-1">
                                                    <p>
                                                        <span className="font-medium">วันที่ตรวจ:</span>{" "}
                                                        {inspection.date}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">อาคาร/ชั้น:</span>{" "}
                                                        {inspection.building} ชั้น {inspection.floor || "-"}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">หน่วยงานหลัก:</span>{" "}
                                                        {division?.name || inspection.division}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">หน่วยงานย่อย:</span>{" "}
                                                        {department?.name || inspection.department || "-"}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    {item.details && (
                                                        <p>
                                                            <span className="font-medium">รายละเอียด:</span>{" "}
                                                            <span className="text-muted-foreground">
                                                                {item.details}
                                                            </span>
                                                        </p>
                                                    )}
                                                    {item.recommendations && (
                                                        <p>
                                                            <span className="font-medium">
                                                                ข้อเสนอแนะ / การแก้ไข:
                                                            </span>{" "}
                                                            <span className="text-muted-foreground">
                                                                {item.recommendations}
                                                            </span>
                                                        </p>
                                                    )}
                                                    {(item.responsible || item.responsibleOther) && (
                                                        <p>
                                                            <span className="font-medium">ผู้รับผิดชอบ:</span>{" "}
                                                            <span className="text-muted-foreground">
                                                                {item.responsible || item.responsibleOther}
                                                            </span>
                                                        </p>
                                                    )}
                                                    <p>
                                                        <span className="font-medium">ผู้สำรวจ:</span>{" "}
                                                        <span className="text-muted-foreground">
                                                            {inspection.surveyTeam.length > 0
                                                                ? inspection.surveyTeam.join(", ")
                                                                : inspection.inspectorName || "-"}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            {allImages.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="mb-2 text-xs font-medium text-foreground">
                                                        รูปภาพประกอบ:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {allImages.map((img, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setPreviewImage(img)}
                                                                className="overflow-hidden rounded-md border hover:ring-2 hover:ring-primary focus:outline-none"
                                                            >
                                                                <img
                                                                    src={img}
                                                                    alt={`รูปที่ ${idx + 1}`}
                                                                    className="h-14 w-14 object-cover"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* รายการตรวจทั้งหมด (แบบการ์ด, ครบทุกฟิลด์) */}
                    <Card className="p-4 md:p-6">
                        <h2 className="mb-4 text-lg md:text-xl font-bold text-foreground">
                            รายการตรวจทั้งหมด
                        </h2>

                        <div className="space-y-3">
                            {inspection.items.map((item, index) => {
                                const allImages = getAllImagesForItem(item);

                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-lg border bg-background p-3 md:p-4"
                                    >
                                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {index + 1}. {item.name}
                                            </p>
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                                                {item.status === "normal" && (
                                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                                                        ปกติ
                                                    </span>
                                                )}
                                                {item.status === "abnormal" && (
                                                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                                        ไม่ปกติ
                                                    </span>
                                                )}
                                                {item.status === "not_relevant" && (
                                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                                        ไม่เกี่ยวข้อง
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        <div className="grid gap-3 text-xs md:text-sm md:grid-cols-3">
                                            <div className="space-y-1">
                                                <p>
                                                    <span className="font-medium">วันที่ตรวจ:</span>{" "}
                                                    {inspection.date}
                                                </p>
                                                <p>
                                                    <span className="font-medium">อาคาร:</span>{" "}
                                                    {inspection.building}
                                                </p>
                                                <p>
                                                    <span className="font-medium">ชั้น:</span>{" "}
                                                    {inspection.floor || "-"}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <p>
                                                    <span className="font-medium">หน่วยงานหลัก:</span>{" "}
                                                    {division?.name || inspection.division}
                                                </p>
                                                <p>
                                                    <span className="font-medium">หน่วยงานย่อย:</span>{" "}
                                                    {department?.name || inspection.department || "-"}
                                                </p>
                                                <p>
                                                    <span className="font-medium">หมวดหมู่:</span>{" "}
                                                    {item.category}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                {item.details && (
                                                    <p>
                                                        <span className="font-medium">รายละเอียด:</span>{" "}
                                                        <span className="text-muted-foreground">
                                                            {item.details}
                                                        </span>
                                                    </p>
                                                )}
                                                {item.recommendations && (
                                                    <p>
                                                        <span className="font-medium">
                                                            ข้อเสนอแนะ / การแก้ไข:
                                                        </span>{" "}
                                                        <span className="text-muted-foreground">
                                                            {item.recommendations}
                                                        </span>
                                                    </p>
                                                )}
                                                {(item.responsible || item.responsibleOther) && (
                                                    <p>
                                                        <span className="font-medium">ผู้รับผิดชอบ:</span>{" "}
                                                        <span className="text-muted-foreground">
                                                            {item.responsible || item.responsibleOther}
                                                        </span>
                                                    </p>
                                                )}
                                                <p>
                                                    <span className="font-medium">ผู้สำรวจ:</span>{" "}
                                                    <span className="text-muted-foreground">
                                                        {inspection.surveyTeam.length > 0
                                                            ? inspection.surveyTeam.join(", ")
                                                            : inspection.inspectorName || "-"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        {allImages.length > 0 && (
                                            <div className="mt-3">
                                                <p className="mb-2 text-xs font-medium text-foreground">
                                                    รูปภาพประกอบ:
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {allImages.map((img, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setPreviewImage(img)}
                                                            className="overflow-hidden rounded-md border hover:ring-2 hover:ring-primary focus:outline-none"
                                                        >
                                                            <img
                                                                src={img}
                                                                alt={`รูปที่ ${idx + 1}`}
                                                                className="h-14 w-14 object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* รูปภาพขยายเต็มจอ */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-h-[90vh] max-w-[90vw]">
                        <button
                            type="button"
                            className="absolute -top-3 -right-3 rounded-full bg-white px-2 py-1 text-xs font-medium shadow"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(null);
                            }}
                        >
                            ✕
                        </button>
                        <img
                            src={previewImage}
                            alt="รูปภาพรายการตรวจ"
                            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg object-contain bg-black"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportDetail;
