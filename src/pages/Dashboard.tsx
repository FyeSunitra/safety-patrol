import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { InspectionRecord, INSPECTION_CATEGORIES } from "@/types/inspection";
import { DIVISIONS } from "@/data/divisions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ClipboardList, Plus, Search, ArrowLeft, Download, ChevronDown, LogOut } from "lucide-react";

const Dashboard = () => {
    const navigate = useNavigate();
    const [inspections, setInspections] = useState<InspectionRecord[]>([]);
    // const [selectedYear, setSelectedYear] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const startRef = useRef<HTMLInputElement | null>(null);
    const endRef = useRef<HTMLInputElement | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
    // const [years, setYears] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setIsLoggedIn(!!data.user);
        });

        const { data } = supabase.auth.onAuthStateChange((_e, session) => {
            setIsLoggedIn(!!session?.user);
        });

        return () => {
            data.subscription.unsubscribe();
        };
    }, []);


    useEffect(() => {
        loadInspections();

        // Subscribe to realtime changes
        const channel = supabase
            .channel("dashboard-inspections")
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };


    const loadInspections = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("inspections")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Transform database records to InspectionRecord format
            const transformedData: InspectionRecord[] = (data || []).map((record: any) => ({
                id: record.id,
                date: record.date,
                time: record.time || "",
                building: record.building,
                floor: "",
                division: record.division,
                department: record.department,
                inspectorName: record.inspector_name,
                surveyTeam: record.inspector_name ? record.inspector_name.split(", ") : [],
                items: Array.isArray(record.items) ? record.items : [],
                createdAt: record.created_at,
                updatedAt: record.updated_at,
            }));

            setInspections(transformedData);

            // Extract unique years
            const uniqueYears = Array.from(
                new Set(
                    transformedData.map((i) => {
                        const date = new Date(i.date);
                        return (date.getFullYear() + 543).toString(); // Convert to Buddhist year
                    })
                )
            ).sort((a, b) => b.localeCompare(a));

            // setYears(uniqueYears);
            // if (uniqueYears.length > 0 && !selectedYear) {
            //     setSelectedYear(uniqueYears[0]);
            // }
        } catch (error) {
            console.error("Error loading inspections:", error);
        } finally {
            setLoading(false);
        }
    };

    // const filteredInspections = inspections.filter((inspection) => {
    //     const date = new Date(inspection.date);
    //     const buddhistYear = (date.getFullYear() + 543).toString();

    //     const matchesYear = !selectedYear || buddhistYear === selectedYear;
    //     const matchesSearch =
    //         !searchQuery ||
    //         inspection.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //         inspection.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //         (inspection.department && inspection.department.toLowerCase().includes(searchQuery.toLowerCase()));

    //     return matchesYear && matchesSearch;
    // });

    const filteredInspections = inspections.filter((inspection) => {
        if (!startDate || !endDate) {
            return false;
        }

        const d = new Date(inspection.date);

        const matchesDate =
            (!startDate || d >= new Date(startDate)) &&
            (!endDate || d <= new Date(endDate));

        const matchesSearch =
            !searchQuery ||
            inspection.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inspection.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inspection.department &&
                inspection.department.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesDate && matchesSearch;
    });

    // Calculate building statistics with department details
    const buildingStats = filteredInspections.reduce((acc, inspection) => {
        if (!acc[inspection.building]) {
            acc[inspection.building] = {
                normal: 0,
                abnormal: 0,
                notRelevant: 0,
                total: 0,
                abnormalByDept: {} as Record<string, Array<{ itemName: string; category: string; date: string }>>,
                notRelevantByDept: {} as Record<string, Array<{ itemName: string; category: string }>>,
            };
        }

        const deptKey = inspection.department || "ไม่ระบุหน่วยงานย่อย";

        inspection.items.forEach((item) => {
            acc[inspection.building].total++;

            if (item.status === "normal") {
                acc[inspection.building].normal++;
            } else if (item.status === "abnormal") {
                acc[inspection.building].abnormal++;
                if (!acc[inspection.building].abnormalByDept[deptKey]) {
                    acc[inspection.building].abnormalByDept[deptKey] = [];
                }
                acc[inspection.building].abnormalByDept[deptKey].push({
                    itemName: item.name,
                    category: item.category,
                    date: inspection.date, // ✅ เก็บวันที่ของการตรวจครั้งนั้น
                });
            } else if (item.status === "not_relevant") {
                acc[inspection.building].notRelevant++;
                if (!acc[inspection.building].notRelevantByDept[deptKey]) {
                    acc[inspection.building].notRelevantByDept[deptKey] = [];
                }
                acc[inspection.building].notRelevantByDept[deptKey].push({
                    itemName: item.name,
                    category: item.category,
                });
            }
        });

        return acc;
    }, {} as Record<string, {
        normal: number;
        abnormal: number;
        notRelevant: number;
        total: number;
        abnormalByDept: Record<string, Array<{ itemName: string; category: string; date: string }>>;
        notRelevantByDept: Record<string, Array<{ itemName: string; category: string }>>;
    }>);


    const buildingChartData = Object.entries(buildingStats).map(([building, stats]) => ({
        name: building,
        ปกติ: stats.total > 0 ? parseFloat(((stats.normal / stats.total) * 100).toFixed(1)) : 0,
        ไม่ปกติ: stats.total > 0 ? parseFloat(((stats.abnormal / stats.total) * 100).toFixed(1)) : 0,
        ไม่เกี่ยวข้อง: stats.total > 0 ? parseFloat(((stats.notRelevant / stats.total) * 100).toFixed(1)) : 0,
    }));

    // Calculate comprehensive division and department statistics with category breakdown
    // const divisionDepartmentStats = filteredInspections.reduce((acc, inspection) => {
    //     const divisionKey = inspection.division;
    //     const departmentKey = inspection.department || "ไม่ระบุหน่วยงานย่อย";

    //     if (!acc[divisionKey]) {
    //         acc[divisionKey] = {
    //             divisionName: divisionKey,
    //             departments: {}
    //         };
    //     }

    //     if (!acc[divisionKey].departments[departmentKey]) {
    //         acc[divisionKey].departments[departmentKey] = {
    //             departmentName: departmentKey,
    //             categories: {}
    //         };
    //     }

    //     inspection.items.forEach((item) => {
    //         const categoryKey = item.category;

    //         if (!acc[divisionKey].departments[departmentKey].categories[categoryKey]) {
    //             acc[divisionKey].departments[departmentKey].categories[categoryKey] = {
    //                 normal: 0,
    //                 abnormal: 0,
    //                 notRelevant: 0,
    //                 abnormalItems: []
    //             };
    //         }

    //         const catData = acc[divisionKey].departments[departmentKey].categories[categoryKey];

    //         if (item.status === "normal") catData.normal++;
    //         else if (item.status === "abnormal") {
    //             catData.abnormal++;
    //             catData.abnormalItems.push({
    //                 itemName: item.name,
    //                 details: item.details,
    //                 responsible: item.responsible,
    //                 date: inspection.date,
    //                 building: inspection.building,
    //             });
    //         }
    //         else if (item.status === "not_relevant") catData.notRelevant++;
    //     });

    //     return acc;
    // }, {} as Record<string, {
    //     divisionName: string;
    //     departments: Record<string, {
    //         departmentName: string;
    //         categories: Record<string, {
    //             normal: number;
    //             abnormal: number;
    //             notRelevant: number;
    //             abnormalItems: Array<{
    //                 itemName: string;
    //                 details?: string;
    //                 responsible?: string;
    //                 date: string;
    //                 building: string;
    //             }>;
    //         }>;
    //     }>;
    // }>);

    const divisionDepartmentStats = filteredInspections.reduce((acc, inspection) => {
        const divisionKey = inspection.division;
        const departmentKey = inspection.department || "ไม่ระบุหน่วยงานย่อย";

        if (!acc[divisionKey]) {
            acc[divisionKey] = {
                divisionName: divisionKey,
                departments: {}
            };
        }

        if (!acc[divisionKey].departments[departmentKey]) {
            acc[divisionKey].departments[departmentKey] = {
                departmentName: departmentKey,
                inspections: {} as Record<string, {
                    id: string;
                    date: string;
                    time: string;
                    building: string;
                    categories: Record<string, {
                        normal: number;
                        abnormal: number;
                        notRelevant: number;
                        abnormalItems: Array<{
                            itemName: string;
                            details?: string;
                            responsible?: string;
                            date: string;
                            building: string;
                        }>;
                    }>;
                }>
            };
        }

        const inspectionKey = inspection.id; // แยกรายครั้งตาม id (ถึงจะวันเดียวกันก็คนละก้อน)

        if (!acc[divisionKey].departments[departmentKey].inspections[inspectionKey]) {
            acc[divisionKey].departments[departmentKey].inspections[inspectionKey] = {
                id: inspection.id,
                date: inspection.date,
                time: inspection.time,
                building: inspection.building,
                categories: {}
            };
        }

        const inspectionEntry = acc[divisionKey].departments[departmentKey].inspections[inspectionKey];

        inspection.items.forEach((item) => {
            const categoryKey = item.category;

            if (!inspectionEntry.categories[categoryKey]) {
                inspectionEntry.categories[categoryKey] = {
                    normal: 0,
                    abnormal: 0,
                    notRelevant: 0,
                    abnormalItems: []
                };
            }

            const catData = inspectionEntry.categories[categoryKey];

            if (item.status === "normal") catData.normal++;
            else if (item.status === "abnormal") {
                catData.abnormal++;
                catData.abnormalItems.push({
                    itemName: item.name,
                    details: item.details,
                    responsible: item.responsible,
                    date: inspection.date,
                    building: inspection.building,
                });
            }
            else if (item.status === "not_relevant") catData.notRelevant++;
        });

        return acc;
    }, {} as Record<string, {
        divisionName: string;
        departments: Record<string, {
            departmentName: string;
            inspections: Record<string, {
                id: string;
                date: string;
                time: string;
                building: string;
                categories: Record<string, {
                    normal: number;
                    abnormal: number;
                    notRelevant: number;
                    abnormalItems: Array<{
                        itemName: string;
                        details?: string;
                        responsible?: string;
                        date: string;
                        building: string;
                    }>;
                }>;
            }>;
        }>;
    }>);

    // Get Thai name for division
    const getDivisionThaiName = (divisionId: string) => {
        const division = DIVISIONS.find(d => d.id === divisionId);
        return division ? division.name : divisionId;
    };

    // Get Thai name for department
    const getDepartmentThaiName = (divisionId: string, departmentId: string) => {
        const division = DIVISIONS.find(d => d.id === divisionId);
        if (!division) return departmentId;
        const department = division.departments.find(d => d.id === departmentId);
        return department ? department.name : departmentId;
    };

    // Get Thai name for category
    const getCategoryThaiName = (categoryKey: string) => {
        const categoryMap: Record<string, string> = {
            physical: "ด้านกายภาพ",
            chemical: "ด้านเคมี",
            biological: "ด้านชีวภาพ",
            ergonomics: "ด้านการยศาสตร์",
            psychosocial: "ด้านจิตสังคม",
            fire: "ด้านอัคคีภัยและเหตุฉุกเฉิน",
            health: "ด้านสุขภาพ",
            environment: "ด้านสิ่งแวดล้อม",
        };
        return categoryMap[categoryKey] || categoryKey;
    };

    // Enhanced custom items with details
    const customItemsWithDetails = filteredInspections.reduce((acc, inspection) => {
        inspection.items.forEach((item) => {
            if (item.isCustom) {
                const key = `${item.category} - ${item.name}`;
                if (!acc[key]) {
                    acc[key] = {
                        normal: 0,
                        abnormal: 0,
                        notRelevant: 0,
                        details: []
                    };
                }
                if (item.status === "normal") acc[key].normal++;
                else if (item.status === "abnormal") acc[key].abnormal++;
                else if (item.status === "not_relevant") acc[key].notRelevant++;

                acc[key].details.push({
                    date: inspection.date,
                    building: inspection.building,
                    division: inspection.division,
                    department: inspection.department,
                    inspectionId: inspection.id,
                });
            }
        });
        return acc;
    }, {} as Record<string, { normal: number; abnormal: number; notRelevant: number; details: any[] }>);

    // Separate custom items statistics
    const customItemsStats = filteredInspections.reduce((acc, inspection) => {
        inspection.items.forEach((item) => {
            if (item.isCustom) {
                const key = `${item.category} - ${item.name}`;
                if (!acc[key]) {
                    acc[key] = { normal: 0, abnormal: 0, notRelevant: 0 };
                }
                if (item.status === "normal") acc[key].normal++;
                else if (item.status === "abnormal") acc[key].abnormal++;
                else if (item.status === "not_relevant") acc[key].notRelevant++;
            }
        });
        return acc;
    }, {} as Record<string, { normal: number; abnormal: number; notRelevant: number }>);

    const COLORS = {
        ปกติ: "#22c55e", // green-500
        ไม่ปกติ: "#ef4444", // red-500
        ไม่เกี่ยวข้อง: "#94a3b8", // slate-400
    };

    const exportInspectionToCSV = (inspection: InspectionRecord) => {
        const csvRows = [];
        // Header
        csvRows.push([
            "วันที่ตรวจ",
            "อาคาร",
            "ชั้น",
            "หน่วยงานหลัก",
            "หน่วยงานย่อย",
            "หมวดหมู่",
            "รายการ",
            "สถานะ",
            "รายละเอียด",
            "ข้อเสนอแนะ",
            "ผู้รับผิดชอบ",
            "คณะผู้สำรวจ"
        ].join(","));

        const division = DIVISIONS.find((d) => d.id === inspection.division);
        const department = division?.departments.find((dept) => dept.id === inspection.department);

        inspection.items.forEach((item) => {
            const row = [
                inspection.date,
                inspection.building,
                inspection.floor,
                division?.name || inspection.division,
                department?.name || inspection.department || "-",
                item.category,
                item.name,
                item.status === "normal" ? "ปกติ" : item.status === "abnormal" ? "ไม่ปกติ" : "ไม่เกี่ยวข้อง",
                item.details || "-",
                item.recommendations || "-",
                item.responsible || "-",
                inspection.surveyTeam.join("; ")
            ].map(field => `"${String(field).replace(/"/g, '""')}"`);

            csvRows.push(row.join(","));
        });

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        const dateStr = new Date(inspection.date).toLocaleDateString('th-TH').replace(/\//g, '-');
        link.setAttribute("href", url);
        link.setAttribute("download", `inspection-${inspection.building}-${dateStr}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="gradient-header py-6 px-4 mb-6">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button onClick={() => navigate("/")} variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-primary-foreground">แดชบอร์ดติดตามผล</h1>
                            <p className="text-primary-foreground/80 text-sm">สถิติและผลการตรวจ</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => navigate("/reports")} variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 border-0">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            ดูรายงาน
                        </Button>

                        {isLoggedIn && (
                            <Button
                                variant="destructive"
                                onClick={handleLogout}
                                className="bg-red-500/80 hover:bg-red-600 border-0"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                ออกจากระบบ
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <div className="container mx-auto px-4">

                <div className="mb-6 grid gap-4 md:grid-cols-2">
                    {/* <div className="space-y-2">
                        <label className="text-sm font-medium">เลือกปี พ.ศ.</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกปี" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div> */}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">เลือกช่วงวันที่</label>

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


                    <div className="space-y-2">
                        <label className="text-sm font-medium">ค้นหาอาคารหรือหน่วยงาน</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="พิมพ์ชื่ออาคารหรือหน่วยงาน..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="buildings" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="buildings">สถิติตามอาคาร</TabsTrigger>
                        <TabsTrigger value="divisions">สถิติภาพรวมหน่วยงาน</TabsTrigger>
                        <TabsTrigger value="custom">รายการตรวจเพิ่มเติม</TabsTrigger>
                    </TabsList>

                    <TabsContent value="buildings" className="space-y-6">
                        {buildingChartData.length > 0 ? (
                            buildingChartData.map((data) => {
                                const stats = buildingStats[data.name];
                                const relatedInspections = filteredInspections.filter(i => i.building === data.name);

                                return (
                                    <Card key={data.name}>
                                        <CardHeader>
                                            <CardTitle>{data.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={[data]}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis domain={[0, 100]} />
                                                    <Tooltip formatter={(value) => `${value}%`} />
                                                    <Legend />
                                                    <Bar dataKey="ปกติ" fill={COLORS.ปกติ} />
                                                    <Bar dataKey="ไม่ปกติ" fill={COLORS.ไม่ปกติ} />
                                                    <Bar dataKey="ไม่เกี่ยวข้อง" fill={COLORS.ไม่เกี่ยวข้อง} />
                                                </BarChart>
                                            </ResponsiveContainer>

                                            {/* Summary of abnormal items by department */}
                                            {Object.keys(stats.abnormalByDept).length > 0 && (
                                                <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                                                    <h4 className="font-semibold text-sm text-destructive mb-2">
                                                        สรุปรายการผิดปกติตามหน่วยงานย่อย:
                                                    </h4>

                                                    <ol className="list-decimal ml-5 space-y-1">
                                                        {Object.entries(stats.abnormalByDept).map(([dept, items], index) => {
                                                            const division = DIVISIONS.find((d) =>
                                                                d.departments.some((dep) => dep.id === dept)
                                                            );
                                                            const deptName =
                                                                division?.departments.find((d) => d.id === dept)?.name || dept;

                                                            const count = items.length;

                                                            // เลือกวันที่ล่าสุดจากชุดนี้ (หรือจะใช้ตัวแรกก็ได้ถ้าช่วงวันที่แคบ)
                                                            const latestDate = items.reduce<Date | null>((acc, item) => {
                                                                const d = new Date(item.date);
                                                                if (!acc || d > acc) return d;
                                                                return acc;
                                                            }, null);

                                                            const dateStr = latestDate
                                                                ? latestDate.toLocaleDateString("th-TH")
                                                                : "";

                                                            return (
                                                                <li key={dept} className="text-sm text-destructive">
                                                                    {deptName} {count} รายการ
                                                                    {dateStr && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {" "}
                                                                            ({dateStr})
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ol>
                                                </div>
                                            )}


                                            {/* Summary of not relevant items */}
                                            {Object.keys(stats.notRelevantByDept).length > 0 && (
                                                <div className="mt-4 p-4 bg-muted rounded-lg border">
                                                    <h4 className="font-semibold text-sm mb-2">
                                                        รายการที่ไม่เกี่ยวข้องตามหน่วยงานย่อย:
                                                    </h4>

                                                    <ol className="list-decimal ml-5 space-y-1">
                                                        {Object.entries(stats.notRelevantByDept).map(([dept, items]) => {
                                                            const division = DIVISIONS.find((d) =>
                                                                d.departments.some((dep) => dep.id === dept)
                                                            );
                                                            const deptName =
                                                                division?.departments.find((d) => d.id === dept)?.name || dept;
                                                            const count = items.length;

                                                            return (
                                                                <li key={dept} className="text-sm text-muted-foreground">
                                                                    {deptName} {count} รายการ
                                                                </li>
                                                            );
                                                        })}
                                                    </ol>
                                                </div>
                                            )}

                                            {/* Export button for each inspection */}
                                            <div className="pt-4 border-t">
                                                <p className="text-sm font-medium mb-2">Export รายงานแต่ละครั้งการตรวจ:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {relatedInspections.map((inspection) => (
                                                        <Button
                                                            key={inspection.id}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => exportInspectionToCSV(inspection)}
                                                        >
                                                            <Download className="mr-2 h-3 w-3" />
                                                            {new Date(inspection.date).toLocaleDateString('th-TH')}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    กรุณาเลือกช่วงวันที่เพื่อดูสถิติ
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="divisions" className="space-y-6">
                        <div className="mb-4">
                            <label className="text-sm font-medium">ค้นหาหน่วยงานย่อย</label>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="พิมพ์ชื่อหน่วยงานย่อย..."
                                    value={departmentSearchQuery}
                                    onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {Object.keys(divisionDepartmentStats).length > 0 ? (
                            <Accordion type="multiple" className="space-y-4">
                                {Object.entries(divisionDepartmentStats).map(
                                    ([divisionId, divisionData]) => {
                                        // 🔍 กรอง department จากช่องค้นหา
                                        const filteredDepartments = Object.entries(
                                            divisionData.departments
                                        ).filter(([deptId]) =>
                                            !departmentSearchQuery
                                                ? true
                                                : getDepartmentThaiName(divisionId, deptId)
                                                    .toLowerCase()
                                                    .includes(departmentSearchQuery.toLowerCase())
                                        );

                                        if (filteredDepartments.length === 0) return null;

                                        return (
                                            <AccordionItem
                                                key={divisionId}
                                                value={divisionId}
                                                className="border rounded-lg"
                                            >
                                                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-semibold">
                                                            {getDivisionThaiName(divisionId)}
                                                        </h3>
                                                        <span className="text-sm text-muted-foreground">
                                                            ({filteredDepartments.length} หน่วยงานย่อย)
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>

                                                <AccordionContent className="px-6 pb-4">
                                                    <Accordion type="multiple" className="space-y-3">
                                                        {filteredDepartments.map(([deptId, deptData]) => (
                                                            <AccordionItem
                                                                key={deptId}
                                                                value={deptId}
                                                                className="border rounded-md bg-muted/30"
                                                            >
                                                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                                                    <h4 className="text-base font-medium">
                                                                        {getDepartmentThaiName(divisionId, deptId)}
                                                                    </h4>
                                                                </AccordionTrigger>

                                                                <AccordionContent className="px-4 pb-4 space-y-4">
                                                                    {/* ▶️ ชั้น “รายครั้งตรวจ” */}
                                                                    <Accordion type="multiple" className="space-y-3">
                                                                        {Object.entries(deptData.inspections)
                                                                            .sort(([, a], [, b]) => {
                                                                                const aDateTime = new Date(
                                                                                    `${a.date} ${a.time || "00:00"}`
                                                                                ).getTime();
                                                                                const bDateTime = new Date(
                                                                                    `${b.date} ${b.time || "00:00"}`
                                                                                ).getTime();
                                                                                return bDateTime - aDateTime;
                                                                            })
                                                                            .map(([inspectionId, inspectionData], index) => (
                                                                                <AccordionItem
                                                                                    key={inspectionId}
                                                                                    value={inspectionId}
                                                                                    className="border rounded-md bg-background"
                                                                                >
                                                                                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                                                                        <div className="flex flex-col items-start">
                                                                                            <span className="text-sm font-semibold">
                                                                                                การตรวจครั้งที่ {index + 1}
                                                                                            </span>
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                วันที่{" "}
                                                                                                {new Date(
                                                                                                    inspectionData.date
                                                                                                ).toLocaleDateString("th-TH")}{" "}
                                                                                                เวลา {inspectionData.time || "-"} | อาคาร{" "}
                                                                                                {inspectionData.building}
                                                                                            </span>
                                                                                        </div>
                                                                                    </AccordionTrigger>

                                                                                    <AccordionContent className="px-4 pb-4 space-y-6">
                                                                                        {Object.entries(
                                                                                            inspectionData.categories
                                                                                        ).map(([categoryKey, categoryData]) => {
                                                                                            const total =
                                                                                                categoryData.normal +
                                                                                                categoryData.abnormal +
                                                                                                categoryData.notRelevant;

                                                                                            if (total === 0) return null;

                                                                                            const chartData = [
                                                                                                {
                                                                                                    name: getCategoryThaiName(categoryKey),
                                                                                                    ปกติ: categoryData.normal,
                                                                                                    ผิดปกติ: categoryData.abnormal,
                                                                                                },
                                                                                            ];

                                                                                            return (
                                                                                                <Card
                                                                                                    key={categoryKey}
                                                                                                    className="border-l-4 border-l-primary"
                                                                                                >
                                                                                                    <CardHeader>
                                                                                                        <CardTitle className="text-base">
                                                                                                            {getCategoryThaiName(categoryKey)}
                                                                                                        </CardTitle>
                                                                                                        <div className="text-sm text-muted-foreground">
                                                                                                            รวม {total} รายการ (ปกติ:{" "}
                                                                                                            {categoryData.normal}, ผิดปกติ:{" "}
                                                                                                            {categoryData.abnormal})
                                                                                                        </div>
                                                                                                    </CardHeader>

                                                                                                    <CardContent className="space-y-4">
                                                                                                        <ResponsiveContainer
                                                                                                            width="100%"
                                                                                                            height={250}
                                                                                                        >
                                                                                                            <BarChart data={chartData}>
                                                                                                                <CartesianGrid strokeDasharray="3 3" />
                                                                                                                <XAxis dataKey="name" />
                                                                                                                <YAxis />
                                                                                                                <Tooltip />
                                                                                                                <Legend />
                                                                                                                <Bar
                                                                                                                    dataKey="ปกติ"
                                                                                                                    fill={COLORS.ปกติ}
                                                                                                                />
                                                                                                                <Bar
                                                                                                                    dataKey="ผิดปกติ"
                                                                                                                    fill={COLORS.ไม่ปกติ}
                                                                                                                />
                                                                                                            </BarChart>
                                                                                                        </ResponsiveContainer>

                                                                                                        {categoryData.abnormalItems
                                                                                                            .length > 0 && (
                                                                                                                <div className="mt-4 space-y-2">
                                                                                                                    <h5 className="font-medium text-sm text-destructive">
                                                                                                                        รายการที่ผิดปกติ:
                                                                                                                    </h5>
                                                                                                                    <div className="space-y-2">
                                                                                                                        {categoryData.abnormalItems.map(
                                                                                                                            (item, idx) => (
                                                                                                                                <div
                                                                                                                                    key={idx}
                                                                                                                                    className="p-3 bg-destructive/10 rounded-md border border-destructive/20"
                                                                                                                                >
                                                                                                                                    <p className="font-medium text-sm">
                                                                                                                                        {item.itemName}
                                                                                                                                    </p>

                                                                                                                                    {item.details && (
                                                                                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                                                                                            รายละเอียด:{" "}
                                                                                                                                            {item.details}
                                                                                                                                        </p>
                                                                                                                                    )}

                                                                                                                                    {item.responsible && (
                                                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                                                            ผู้รับผิดชอบ:{" "}
                                                                                                                                            {item.responsible}
                                                                                                                                        </p>
                                                                                                                                    )}

                                                                                                                                    <p className="text-xs text-muted-foreground">
                                                                                                                                        วันที่:{" "}
                                                                                                                                        {new Date(
                                                                                                                                            item.date
                                                                                                                                        ).toLocaleDateString(
                                                                                                                                            "th-TH"
                                                                                                                                        )}{" "}
                                                                                                                                        | อาคาร:{" "}
                                                                                                                                        {item.building}
                                                                                                                                    </p>
                                                                                                                                </div>
                                                                                                                            )
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}
                                                                                                    </CardContent>
                                                                                                </Card>
                                                                                            );
                                                                                        })}
                                                                                    </AccordionContent>
                                                                                </AccordionItem>
                                                                            ))}
                                                                    </Accordion>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    }
                                )}
                            </Accordion>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    กรุณาเลือกช่วงวันที่เพื่อดูสถิติ
                                </CardContent>
                            </Card>
                        )}

                    </TabsContent>

                    <TabsContent value="custom" className="space-y-4">
                        {Object.keys(customItemsWithDetails).length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(customItemsWithDetails).map(([item, data]) => (
                                    <Card key={item}>
                                        <CardHeader>
                                            <CardTitle className="text-sm">{item}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2 text-sm mb-4">
                                                <div className="flex justify-between">
                                                    <span>ปกติ:</span>
                                                    <span className="font-medium">{data.normal}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>ไม่ปกติ:</span>
                                                    <span className="font-medium text-destructive">{data.abnormal}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>ไม่เกี่ยวข้อง:</span>
                                                    <span className="font-medium">{data.notRelevant}</span>
                                                </div>
                                            </div>
                                            <div className="border-t pt-3">
                                                <p className="text-xs font-medium mb-2">รายละเอียด:</p>
                                                <div className="space-y-1">
                                                    {data.details.map((detail: any, idx: number) => {
                                                        const division = DIVISIONS.find((d) => d.id === detail.division);
                                                        const department = division?.departments.find((dept) => dept.id === detail.department);

                                                        return (
                                                            <div key={idx} className="text-xs text-muted-foreground">
                                                                <p>วันที่: {detail.date}</p>
                                                                <p>อาคาร: {detail.building}</p>
                                                                <p>หน่วยงาน: {division?.name || detail.division}{department && ` - ${department.name}`}</p>
                                                                <Button
                                                                    variant="link"
                                                                    size="sm"
                                                                    className="h-auto p-0 text-xs"
                                                                    onClick={() => navigate(`/report/${detail.inspectionId}`)}
                                                                >
                                                                    ดูรายละเอียด →
                                                                </Button>
                                                                {idx < data.details.length - 1 && <hr className="my-2" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    ไม่มีรายการตรวจเพิ่มเติมในช่วงวันที่เลือก
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Dashboard;
