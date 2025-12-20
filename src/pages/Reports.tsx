import { useEffect, useMemo, useState, useRef } from "react";
import { generatePDF } from "@/lib/pdfGenerator";
import { DIVISIONS } from "@/data/divisions"
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { InspectionItem, InspectionRecord } from "@/types/inspection";
import {
    ArrowLeft,
    Download,
    FileSpreadsheet,
    FileText,
    Home,
    Search,
} from "lucide-react";
import { exportInspectionToExcel } from "@/lib/exportInspectionToExcel";

type RawInspectionRow = {
    id: string;
    user_id: string;
    date: string;
    time: string | null;
    building: string;
    division: string;
    department: string | null;
    inspector_name: string | null;
    items: any;
    created_at: string;
    updated_at: string;
    floor: string | null;
};

type RawCorrectiveActionRow = {
    item_id: string;
    inspection_details?: string | null;
    inspection_recommendations?: string | null;
    inspection_images?: string[] | null;
};

export async function fetchInspectionForExport(
    inspectionId: string
): Promise<InspectionRecord | null> {
    // 1) ดึง inspection ตัวเดียวจาก Supabase
    const { data: inspections, error: inspectionError } = await supabase
        .from("inspections")
        .select("*")
        .eq("id", inspectionId);

    if (inspectionError) {
        console.error("Error loading inspection:", inspectionError);
        return null;
    }

    const row = (inspections as RawInspectionRow[] | null)?.[0];
    if (!row) return null;

    // 2) ดึง corrective_actions ของ inspection นี้
    const { data: correctiveActions, error: correctiveError } = await supabase
        .from("corrective_actions")
        .select(
            "item_id,inspection_details,inspection_recommendations,inspection_images"
        )
        .eq("inspection_id", inspectionId);

    if (correctiveError) {
        console.error("Error loading corrective actions:", correctiveError);
    }

    const caList = (correctiveActions || []) as RawCorrectiveActionRow[];

    const items: InspectionItem[] = (row.items as any[] | null)?.map(
        (item: any) => {
            const ca = caList.find((c) => c.item_id === item.id);

            const baseImages = Array.isArray(item.images) ? item.images : [];
            const caImages = Array.isArray(ca?.inspection_images)
                ? (ca!.inspection_images as string[])
                : [];

            return {
                id: item.id,
                category: item.category,
                name: item.name,
                status: item.status,
                details: ca?.inspection_details ?? item.details,
                recommendations: ca?.inspection_recommendations ?? item.recommendations,
                images: [...baseImages, ...caImages],
                responsible: item.responsible,
                responsibleOther: item.responsibleOther,
                isCustom: item.isCustom,
                inspection_images: caImages,
                inspection_details: ca?.inspection_details,
                inspection_recommendations: ca?.inspection_recommendations,
                action_images: item.action_images,
            } as InspectionItem;
        }
    ) ?? [];

    const inspection: InspectionRecord = {
        id: row.id,
        date: row.date,
        time: row.time || undefined,
        building: row.building,
        floor: row.floor || "-",
        division: row.division,
        department: row.department || undefined,
        surveyTeam: [],
        inspectorName: row.inspector_name || undefined,
        items,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };

    return inspection;
}


const Reports = () => {
    const navigate = useNavigate();

    const [inspections, setInspections] = useState<InspectionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const startRef = useRef<HTMLInputElement | null>(null);
    const endRef = useRef<HTMLInputElement | null>(null);

    const [selectedDivision, setSelectedDivision] = useState<string>("");
    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [inspection, setInspection] = useState<InspectionRecord | null>(null);
    const [correctiveActions, setCorrectiveActions] = useState<
        {
            item_id: string;
            inspection_images?: string[] | null;
            inspection_details?: string | null;
            inspection_recommendations?: string | null;
        }[]
    >([]);


    useEffect(() => {
        loadInspections();

        const channel = supabase
            .channel("reports-inspections")
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

    const loadInspections = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("inspections")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const transformedData: InspectionRecord[] = (data || []).map(
                (record: any) => ({
                    id: record.id,
                    date: record.date, // "2025-12-11"
                    time: record.time || "",
                    building: record.building,
                    floor: "", // ยังไม่มีใน DB ก็เว้นไว้ก่อน
                    division: record.division,
                    department: record.department,
                    inspectorName: record.inspector_name,
                    surveyTeam: record.inspector_name
                        ? record.inspector_name.split(", ")
                        : [],
                    items: Array.isArray(record.items) ? record.items : [],
                    createdAt: record.created_at,
                    updatedAt: record.updated_at,
                })
            );

            setInspections(transformedData);
            console.log("Inspections loaded:", transformedData);
        } catch (error) {
            console.error("Error loading inspections:", error);
        } finally {
            setLoading(false);
        }
    };

    // ชุดข้อมูล departments ของ division ที่เลือก
    const currentDivision = useMemo(
        () => DIVISIONS.find((d) => d.id === selectedDivision),
        [selectedDivision]
    );

    const departmentOptions = currentDivision?.departments ?? [];

    // ฟังก์ชันแปลง division/department id -> ชื่อไทย
    const getDivisionName = (divisionId: string) => {
        const division = DIVISIONS.find((d) => d.id === divisionId);
        return division?.name || divisionId || "-";
    };

    const getDepartmentName = (divisionId: string, departmentId?: string) => {
        if (!divisionId || !departmentId) return departmentId || "-";
        const division = DIVISIONS.find((d) => d.id === divisionId);
        const department = division?.departments.find(
            (dept) => dept.id === departmentId
        );
        return department?.name || departmentId;
    };

    // ฟิลเตอร์ข้อมูลตามวันที่, หน่วยงาน, คำค้น
    const filteredInspections = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return inspections.filter((inspection) => {
            // filter by date range (ไม่เลือกก็ไม่กรอง)
            const d = inspection.date ? new Date(inspection.date) : null;
            let matchesDate = true;

            if (d) {
                if (startDate) {
                    const s = new Date(startDate);
                    if (d < s) matchesDate = false;
                }
                if (endDate) {
                    const e = new Date(endDate);
                    // รวมวัน endDate ด้วย -> +1 วัน แล้วใช้ < next day
                    e.setDate(e.getDate() + 1);
                    if (d >= e) matchesDate = false;
                }
            }

            // filter by division / department
            const matchesDivision =
                !selectedDivision || inspection.division === selectedDivision;

            const matchesDepartment =
                !selectedDepartment || inspection.department === selectedDepartment;

            // text search
            const divisionName = getDivisionName(inspection.division).toLowerCase();
            const departmentName = getDepartmentName(
                inspection.division,
                inspection.department
            ).toLowerCase();

            const matchesSearch =
                !term ||
                inspection.building.toLowerCase().includes(term) ||
                divisionName.includes(term) ||
                departmentName.includes(term);

            return matchesDate && matchesDivision && matchesDepartment && matchesSearch;
        });
    }, [
        inspections,
        searchTerm,
        startDate,
        endDate,
        selectedDivision,
        selectedDepartment,
    ]);

    // // Export เป็น Excel (CSV) ต่อ 1 ครั้งตรวจ (reuse logic เดิมจาก Dashboard)
    // const exportInspectionToCSV = (inspection: InspectionRecord) => {
    //     const csvRows: string[] = [];

    //     csvRows.push(
    //         [
    //             "วันที่ตรวจ",
    //             "อาคาร",
    //             "ชั้น",
    //             "หน่วยงานหลัก",
    //             "หน่วยงานย่อย",
    //             "หมวดหมู่",
    //             "รายการ",
    //             "สถานะ",
    //             "รายละเอียด",
    //             "ข้อเสนอแนะ",
    //             "ผู้รับผิดชอบ",
    //             "คณะผู้สำรวจ",
    //         ].join(",")
    //     );

    //     const divisionName = getDivisionName(inspection.division);
    //     const departmentName = getDepartmentName(
    //         inspection.division,
    //         inspection.department
    //     );

    //     inspection.items.forEach((item) => {
    //         const row = [
    //             inspection.date,
    //             inspection.building,
    //             inspection.floor || "-",
    //             divisionName,
    //             departmentName,
    //             item.category,
    //             item.name,
    //             item.status === "normal"
    //                 ? "ปกติ"
    //                 : item.status === "abnormal"
    //                     ? "ไม่ปกติ"
    //                     : "ไม่เกี่ยวข้อง",
    //             item.details || "-",
    //             item.recommendations || "-",
    //             item.responsible || "-",
    //             inspection.surveyTeam.join("; "),
    //         ].map((field) => `"${String(field).replace(/"/g, '""')}"`);

    //         csvRows.push(row.join(","));
    //     });

    //     const csvContent = "\uFEFF" + csvRows.join("\n");
    //     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement("a");

    //     const dateStr = inspection.date
    //         ? new Date(inspection.date)
    //             .toLocaleDateString("th-TH")
    //             .replace(/\//g, "-")
    //         : "";

    //     link.href = url;
    //     link.download = `inspection-${inspection.building}-${dateStr}.csv`;
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    // };

    // แก้ให้รับ inspection เป็นพารามิเตอร์
    const handleDownloadExcel = async (inspectionId: string) => {
        const fullInspection = await fetchInspectionForExport(inspectionId);
        if (!fullInspection) return;

        const division = DIVISIONS.find(
            (d) => d.id === fullInspection.division
        );
        const department = division?.departments.find(
            (dept) => dept.id === fullInspection.department
        );

        await exportInspectionToExcel(
            fullInspection,
            division?.name,
            department?.name
        );
    };


    const getAllImagesForItem = (item: any): string[] => {
        if (Array.isArray(item.images)) {
            // ลบซ้ำเผื่อไว้
            return Array.from(new Set(item.images));
        }
        return [];
    };
    const handleExportPDF = async (inspectionId: string) => {
        const fullInspection = await fetchInspectionForExport(inspectionId);
        if (!fullInspection) return;

        const division = DIVISIONS.find(
            (d) => d.id === fullInspection.division
        );
        const department = division?.departments.find(
            (dept) => dept.id === fullInspection.department
        );

        generatePDF(fullInspection, division?.name, department?.name);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="mt-2 text-muted-foreground">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="gradient-header py-6 px-4">
                <div className="mx-auto max-w-6xl flex items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="text-primary-foreground hover:bg-primary-foreground/20"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-primary-foreground">
                                รายงานการตรวจสอบ
                            </h1>
                            <p className="text-primary-foreground/80 text-sm">
                                ดูและดาวน์โหลดผลการตรวจทุกครั้ง
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate("/")}
                        className="border-primary-foreground text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20"
                    >
                        <Home className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-6xl p-4 space-y-4">
                {/* Filter bar */}
                <Card className="p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* ช่วงวันที่ */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ช่วงวันที่ตรวจ</label>

                            <div className="grid grid-cols-2 gap-2">

                                <Input
                                    type="date"
                                    ref={startRef}
                                    value={startDate}
                                    className="cursor-pointer w-full"
                                    onClick={() => startRef.current?.showPicker()}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />

                                <Input
                                    type="date"
                                    ref={endRef}
                                    value={endDate}
                                    className="cursor-pointer w-full"
                                    onClick={() => endRef.current?.showPicker()}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />

                            </div>
                        </div>

                        {/* หน่วยงานหลัก (Division) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">หน่วยงานหลัก</label>
                            <Select
                                value={selectedDivision || undefined}
                                onValueChange={(value) => {
                                    setSelectedDivision(value);
                                    setSelectedDepartment("");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="ทุกหน่วยงาน" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DIVISIONS.map((division) => (
                                        <SelectItem key={division.id} value={division.id}>
                                            {division.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* หน่วยงานย่อย (Department) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">หน่วยงานย่อย</label>
                            <Select
                                value={selectedDepartment || undefined}
                                onValueChange={setSelectedDepartment}
                                disabled={!selectedDivision}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            selectedDivision ? "ทุกหน่วยงานย่อย" : "เลือกหน่วยงานหลักก่อน"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {departmentOptions.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Search box */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ค้นหาเพิ่มเติม</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาจากชื่ออาคาร, หน่วยงาน, ฯลฯ"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </Card>

                {/* Table */}
                <Card className="overflow-hidden">
                    {filteredInspections.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-lg font-medium text-foreground">ไม่พบรายงาน</p>
                            <p className="text-sm text-muted-foreground">
                                ลองปรับช่วงวันที่ หรือเงื่อนไขการค้นหาใหม่
                            </p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-primary text-white">
                                    <tr>
                                        <th className="border-b px-4 py-3 text-left w-[140px]">
                                            วันที่ตรวจ
                                        </th>
                                        <th className="border-b px-4 py-3 text-left">
                                            หน่วยงานย่อย
                                        </th>
                                        <th className="border-b px-4 py-3 text-left">
                                            อาคาร
                                        </th>
                                        <th className="border-b px-4 py-3 text-center">
                                            ไฟล์
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInspections.map((inspection) => (
                                        <tr
                                            key={inspection.id}
                                            className="hover:bg-muted/40 cursor-pointer"
                                            onClick={(e) => {
                                                // อยากให้คลิกทั้งแถวไปหน้า detail แต่ไม่ให้คลิกปุ่มดาวน์โหลดหลุดไป
                                                const target = e.target as HTMLElement;
                                                if (target.closest("button")) return;
                                                navigate(`/report/${inspection.id}`);
                                            }}
                                        >
                                            <td className="border-b px-4 py-3 align-top">
                                                {inspection.date
                                                    ? new Date(inspection.date).toLocaleDateString(
                                                        "th-TH"
                                                    )
                                                    : "-"}
                                                {inspection.time && (
                                                    <div className="text-xs text-muted-foreground">
                                                        เวลา {inspection.time}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="border-b px-4 py-3 align-top">
                                                <div className="font-medium">
                                                    {getDepartmentName(
                                                        inspection.division,
                                                        inspection.department
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {getDivisionName(inspection.division)}
                                                </div>
                                            </td>
                                            <td className="border-b px-4 py-3 align-top">
                                                <div className="font-medium">
                                                    {inspection.building || "-"}
                                                </div>
                                            </td>
                                            <td className="border-b px-4 py-3 align-top">
                                                <div className="flex flex-wrap gap-3 justify-center">
                                                    <button
                                                        onClick={() => handleDownloadExcel(inspection.id)}
                                                        title="ดาวน์โหลด Excel"
                                                        className="hover:scale-110 transition"
                                                    >
                                                        <img
                                                            src="https://upload.wikimedia.org/wikipedia/commons/e/e3/Microsoft_Office_Excel_%282019%E2%80%932025%29.svg"
                                                            alt="Excel"
                                                            className="h-8 w-8"
                                                        />
                                                    </button>

                                                    <button
                                                        onClick={() => handleExportPDF(inspection.id)}
                                                        title="ดาวน์โหลด PDF"
                                                        className="hover:scale-110 transition"
                                                    >
                                                        <img
                                                            src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                                                            alt="PDF"
                                                            className="h-8 w-8"
                                                        />
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Reports;
