import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
    ArrowLeft,
    Camera,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileEdit,
    ChevronRight,
    Building,
    User,
    Calendar,
    FileText,
    Image as ImageIcon,
    Briefcase
} from "lucide-react";
import { useCorrectiveActions, CorrectiveActionData } from "@/hooks/useCorrectiveActions";

const STATUS_OPTIONS = ["กำลังตรวจสอบ", "ดำเนินการแก้ไข", "แก้ไขเสร็จสิ้น"] as const;
type StatusType = typeof STATUS_OPTIONS[number];

const STATUS_CONFIG: Record<StatusType, { color: string; icon: React.ReactNode; bgColor: string }> = {
    "กำลังตรวจสอบ": {
        color: "text-warning",
        icon: <Clock className="h-4 w-4" />,
        bgColor: "bg-warning/10 border-warning/30"
    },
    "ดำเนินการแก้ไข": {
        color: "text-primary",
        icon: <FileEdit className="h-4 w-4" />,
        bgColor: "bg-primary/10 border-primary/30"
    },
    "แก้ไขเสร็จสิ้น": {
        color: "text-success",
        icon: <CheckCircle2 className="h-4 w-4" />,
        bgColor: "bg-success/10 border-success/30"
    },
};

const FollowUp = () => {
    const navigate = useNavigate();
    const { actions, loading, updateAction } = useCorrectiveActions();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [selectedAction, setSelectedAction] = useState<CorrectiveActionData | null>(null);
    const [editFormData, setEditFormData] = useState({
        status: "" as StatusType,
        action_details: "",
        action_date: "",
        action_by: "",
    });
    const [newImages, setNewImages] = useState<string[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Group actions by responsible party -> building -> division/department
    const groupedByResponsible = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, CorrectiveActionData[]>>> = {};
        actions.forEach((action) => {
            const responsible = action.responsible || "ไม่ระบุผู้รับผิดชอบ";
            const building = action.building || "ไม่ระบุอาคาร";
            const dept = action.department || action.division || "ไม่ระบุหน่วยงาน";

            if (!groups[responsible]) groups[responsible] = {};
            if (!groups[responsible][building]) groups[responsible][building] = {};
            if (!groups[responsible][building][dept]) groups[responsible][building][dept] = [];

            groups[responsible][building][dept].push(action);
        });
        return groups;
    }, [actions]);

    // Count by responsible
    const responsibleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        actions.forEach((action) => {
            const key = action.responsible || "ไม่ระบุผู้รับผิดชอบ";
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [actions]);

    // Summary statistics
    const statusSummary = useMemo(() => {
        const summary: Record<StatusType, CorrectiveActionData[]> = {
            "กำลังตรวจสอบ": [],
            "ดำเนินการแก้ไข": [],
            "แก้ไขเสร็จสิ้น": [],
        };
        actions.forEach((action) => {
            if (summary[action.status as StatusType]) {
                summary[action.status as StatusType].push(action);
            }
        });
        return summary;
    }, [actions]);

    const handleOpenEdit = (action: CorrectiveActionData) => {
        if (!isLoggedIn) return;
        setSelectedAction(action);
        setEditFormData({
            status: action.status,
            action_details: action.action_details || "",
            action_date: action.action_date || "",
            action_by: action.action_by || "",
        });
        setNewImages(action.action_images || []);
        setIsDialogOpen(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const fileArray = Array.from(files);
            fileArray.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewImages((prev) => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSave = async () => {
        if (!selectedAction) return;

        // Validate required field
        if (!editFormData.action_details.trim()) {
            toast.error("กรุณากรอกรายละเอียดการแก้ไข");
            return;
        }

        const success = await updateAction(selectedAction.id, {
            status: editFormData.status,
            action_details: editFormData.action_details,
            action_date: editFormData.action_date,
            action_by: editFormData.action_by,
            action_images: newImages,
        });

        if (success) {
            setIsDialogOpen(false);
            setSelectedAction(null);
        }
    };

    const renderStatusBadge = (status: StatusType) => {
        const config = STATUS_CONFIG[status];
        return (
            <Badge variant="outline" className={`${config.color} ${config.bgColor} flex items-center gap-1`}>
                {config.icon}
                {status}
            </Badge>
        );
    };

    const renderActionCard = (action: CorrectiveActionData) => (
        <Card
            key={action.id}
            className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${action.status === "แก้ไขเสร็จสิ้น"
                ? "border-l-success"
                : action.status === "ดำเนินการแก้ไข"
                    ? "border-l-primary"
                    : "border-l-warning"
                }`}
            onClick={isLoggedIn ? () => handleOpenEdit(action) : undefined}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{action.item_name}</p>
                        <p className="text-sm text-muted-foreground">{action.category}</p>
                        {action.inspection_details && (
                            <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                                <p className="text-xs font-medium text-destructive">รายละเอียดความผิดปกติ:</p>
                                <p className="text-xs text-foreground">{action.inspection_details}</p>
                            </div>
                        )}
                        {action.inspection_recommendations && (
                            <div className="mt-1 p-2 bg-warning/10 rounded border border-warning/20">
                                <p className="text-xs font-medium text-warning">แนวทางการแก้ไข:</p>
                                <p className="text-xs text-foreground">{action.inspection_recommendations}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(action.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                {action.inspection_images && action.inspection_images.length > 0 && (
                    <div className="mt-2 flex gap-1">
                        {action.inspection_images.slice(0, 3).map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`รูปจากผู้ตรวจ ${idx + 1}`}
                                className="h-12 w-12 rounded object-cover"
                            />
                        ))}
                        {action.inspection_images.length > 3 && (
                            <span className="text-xs text-muted-foreground self-center">+{action.inspection_images.length - 3}</span>
                        )}
                    </div>
                )}
                {action.action_date && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>อัปเดตเมื่อ: {action.action_date}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderInspectionDetails = (action: CorrectiveActionData) => (
        <div className="space-y-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                ข้อมูลจากผู้ตรวจสอบ
            </p>
            {action.inspection_details && (
                <div>
                    <p className="text-xs font-medium text-muted-foreground">รายละเอียดความผิดปกติ</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{action.inspection_details}</p>
                </div>
            )}
            {action.inspection_recommendations && (
                <div>
                    <p className="text-xs font-medium text-muted-foreground">แนวทางการแก้ไขที่แนะนำ</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{action.inspection_recommendations}</p>
                </div>
            )}
            {action.inspection_images && action.inspection_images.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">รูปภาพจากผู้ตรวจสอบ</p>
                    <div className="grid grid-cols-3 gap-2">
                        {action.inspection_images.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`รูปจากผู้ตรวจ ${idx + 1}`}
                                className="h-20 w-full rounded object-cover"
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderDetailView = (action: CorrectiveActionData) => (
        <div className="space-y-4 p-4 bg-success/5 rounded-lg border border-success/20">
            <p className="text-sm font-semibold text-success flex items-center gap-2">
                <FileText className="h-4 w-4" />
                บันทึกการแก้ไขจากผู้รับผิดชอบ
            </p>
            <div className="grid gap-3">
                {action.action_by && (
                    <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">ผู้ดำเนินการ</p>
                            <p className="text-sm text-muted-foreground">{action.action_by}</p>
                        </div>
                    </div>
                )}
                {action.action_date && (
                    <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">วันที่ดำเนินการ</p>
                            <p className="text-sm text-muted-foreground">{action.action_date}</p>
                        </div>
                    </div>
                )}
                {action.action_details && (
                    <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">รายละเอียดการแก้ไข</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{action.action_details}</p>
                        </div>
                    </div>
                )}
                {action.action_images && action.action_images.length > 0 && (
                    <div className="flex items-start gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium mb-2">รูปภาพการแก้ไข</p>
                            <div className="grid grid-cols-3 gap-2">
                                {action.action_images.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`รูปที่ ${idx + 1}`}
                                        className="h-20 w-full rounded object-cover"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setIsLoggedIn(!!data.user);
        });
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="gradient-header py-6 px-4">
                <div className="mx-auto max-w-4xl flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/20">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-primary-foreground">ติดตามและปรับปรุงแก้ไข</h1>
                        <p className="text-primary-foreground/80 text-sm">ติดตามสถานะการแก้ไขปัญหา</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl p-4 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    {STATUS_OPTIONS.map((status) => {
                        const config = STATUS_CONFIG[status];
                        const count = statusSummary[status].length;
                        return (
                            <Card key={status} className={`${config.bgColor} border`}>
                                <CardContent className="p-4 text-center">
                                    <div className={`flex items-center justify-center gap-2 ${config.color} mb-1`}>
                                        {config.icon}
                                        <span className="text-2xl font-bold">{count}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{status}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {actions.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                            <p className="text-lg font-medium">ไม่มีรายการที่ต้องติดตาม</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                ยังไม่มีรายการไม่ปกติที่ต้องดำเนินการแก้ไข
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue="by-responsible" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted">
                            <TabsTrigger value="by-responsible" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                แยกตามผู้รับผิดชอบ
                            </TabsTrigger>
                            <TabsTrigger value="by-status" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                สรุปตามสถานะ
                            </TabsTrigger>
                        </TabsList>

                        {/* By Responsible Tab - Hierarchical View */}
                        <TabsContent value="by-responsible" className="space-y-4 mt-4">
                            <Accordion type="multiple" className="w-full space-y-2">
                                {Object.entries(groupedByResponsible).map(([responsible, buildings]) => (
                                    <AccordionItem key={responsible} value={responsible} className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline gradient-header">
                                            <div className="flex items-center gap-2 text-primary-foreground">
                                                <Briefcase className="h-5 w-5" />
                                                <span className="font-semibold">{responsible}</span>
                                                <Badge className="ml-2 bg-primary-foreground/20 text-primary-foreground border-0">
                                                    {responsibleCounts[responsible]} รายการ
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4 pt-2">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                                {Object.entries(buildings).map(([building, departments]) => (
                                                    <AccordionItem key={building} value={building} className="border rounded-lg bg-card">
                                                        <AccordionTrigger className="px-4 py-2 hover:no-underline">
                                                            <div className="flex items-center gap-2">
                                                                <Building className="h-4 w-4 text-secondary" />
                                                                <span className="font-medium">{building}</span>
                                                                <Badge variant="outline" className="ml-2">
                                                                    {Object.values(departments).flat().length} รายการ
                                                                </Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="px-4 pb-4">
                                                            <Accordion type="multiple" className="w-full space-y-2">
                                                                {Object.entries(departments).map(([dept, items]) => (
                                                                    <AccordionItem key={dept} value={dept} className="border rounded-lg bg-muted/30">
                                                                        <AccordionTrigger className="px-4 py-2 hover:no-underline">
                                                                            <div className="flex items-center gap-2">
                                                                                <User className="h-4 w-4 text-accent" />
                                                                                <span className="text-sm">{dept}</span>
                                                                                <Badge variant="secondary" className="ml-2">
                                                                                    {items.length} รายการ
                                                                                </Badge>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="px-2 pb-2">
                                                                            <div className="space-y-3">
                                                                                {items.map(renderActionCard)}
                                                                            </div>
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
                                ))}
                            </Accordion>
                        </TabsContent>

                        {/* By Status Tab - Shows responsible party updates */}
                        <TabsContent value="by-status" className="space-y-4 mt-4">
                            <Accordion type="multiple" className="w-full space-y-2">
                                {STATUS_OPTIONS.map((status) => {
                                    const items = statusSummary[status];
                                    const config = STATUS_CONFIG[status];
                                    return (
                                        <AccordionItem key={status} value={status} className={`border rounded-lg ${config.bgColor}`}>
                                            <AccordionTrigger className="px-4 hover:no-underline">
                                                <div className="flex items-center gap-2">
                                                    <span className={config.color}>{config.icon}</span>
                                                    <span className="font-medium">{status}</span>
                                                    <Badge variant="secondary" className="ml-2">
                                                        {items.length} รายการ
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-4">
                                                {items.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        ไม่มีรายการในสถานะนี้
                                                    </p>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {items.map((action) => (
                                                            <Card key={action.id} className="bg-card border">
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                                        <div>
                                                                            <p className="font-medium">{action.item_name}</p>
                                                                            <p className="text-sm text-muted-foreground">{action.category}</p>
                                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                                <Building className="h-3 w-3 inline mr-1" />
                                                                                {action.building} - {action.division}
                                                                            </p>
                                                                            <Badge variant="outline" className="mt-2">
                                                                                ผู้รับผิดชอบ: {action.responsible}
                                                                            </Badge>
                                                                        </div>
                                                                        {isLoggedIn && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleOpenEdit(action)}
                                                                            >
                                                                                <FileEdit className="h-4 w-4 mr-1" />
                                                                                แก้ไข
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    {/* Show inspection details from inspector */}
                                                                    {(action.inspection_details || action.inspection_recommendations || action.inspection_images?.length) &&
                                                                        renderInspectionDetails(action)
                                                                    }
                                                                    {/* Show action details from responsible party */}
                                                                    {(action.action_details || action.action_date || action.action_images?.length) &&
                                                                        renderDetailView(action)
                                                                    }
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card">
                    <DialogHeader>
                        <DialogTitle>บันทึกการดำเนินการแก้ไข</DialogTitle>
                    </DialogHeader>

                    {selectedAction && (
                        <div className="space-y-4">
                            <div className="bg-muted p-3 rounded-lg">
                                <p className="font-medium">{selectedAction.item_name}</p>
                                <p className="text-sm text-muted-foreground">{selectedAction.category}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {selectedAction.building} - {selectedAction.division}
                                </p>
                                <Badge variant="outline" className="mt-2">
                                    ผู้รับผิดชอบ: {selectedAction.responsible}
                                </Badge>
                            </div>

                            {/* Show inspection details from inspector in dialog */}
                            {(selectedAction.inspection_details || selectedAction.inspection_recommendations || selectedAction.inspection_images?.length) && (
                                <div className="space-y-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                                    <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        ข้อมูลจากผู้ตรวจสอบ
                                    </p>
                                    {selectedAction.inspection_details && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">รายละเอียดความผิดปกติ</p>
                                            <p className="text-sm">{selectedAction.inspection_details}</p>
                                        </div>
                                    )}
                                    {selectedAction.inspection_recommendations && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">แนวทางการแก้ไข</p>
                                            <p className="text-sm">{selectedAction.inspection_recommendations}</p>
                                        </div>
                                    )}
                                    {selectedAction.inspection_images && selectedAction.inspection_images.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">รูปภาพจากผู้ตรวจ</p>
                                            <div className="grid grid-cols-3 gap-1">
                                                {selectedAction.inspection_images.map((img, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={img}
                                                        alt={`รูปจากผู้ตรวจ ${idx + 1}`}
                                                        className="h-16 w-full rounded object-cover"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>สถานะการดำเนินการ</Label>
                                <Select
                                    value={editFormData.status}
                                    onValueChange={(value: StatusType) =>
                                        setEditFormData(prev => ({ ...prev, status: value }))
                                    }
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="เลือกสถานะ" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover">
                                        {STATUS_OPTIONS.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                <div className="flex items-center gap-2">
                                                    {STATUS_CONFIG[status].icon}
                                                    {status}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>วันที่ดำเนินการ</Label>
                                <Input
                                    type="date"
                                    value={editFormData.action_date}
                                    onChange={(e) =>
                                        setEditFormData(prev => ({ ...prev, action_date: e.target.value }))
                                    }
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>ชื่อผู้ดำเนินการ</Label>
                                <Input
                                    placeholder="ระบุชื่อผู้ดำเนินการ"
                                    value={editFormData.action_by}
                                    onChange={(e) =>
                                        setEditFormData(prev => ({ ...prev, action_by: e.target.value }))
                                    }
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    รายละเอียดการแก้ไข <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    placeholder="อธิบายรายละเอียดการดำเนินการแก้ไข..."
                                    rows={4}
                                    value={editFormData.action_details}
                                    onChange={(e) =>
                                        setEditFormData(prev => ({ ...prev, action_details: e.target.value }))
                                    }
                                    className={`bg-background ${!editFormData.action_details.trim() ? 'border-destructive' : ''}`}
                                    required
                                />
                                {!editFormData.action_details.trim() && (
                                    <p className="text-xs text-destructive">จำเป็นต้องกรอกข้อมูล</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>รูปภาพการแก้ไข</Label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById("action-image")?.click()}
                                    >
                                        <Camera className="mr-2 h-4 w-4" />
                                        เพิ่มรูปภาพ
                                    </Button>
                                    <input
                                        id="action-image"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                                {newImages.length > 0 && (
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        {newImages.map((img, idx) => (
                                            <div key={idx} className="relative">
                                                <img
                                                    src={img}
                                                    alt={`รูปที่ ${idx + 1}`}
                                                    className="h-20 w-full rounded object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs"
                                                    onClick={() => setNewImages(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <DialogClose asChild>
                                    <Button variant="outline" className="flex-1">
                                        ยกเลิก
                                    </Button>
                                </DialogClose>
                                <Button className="flex-1 gradient-primary text-primary-foreground" onClick={handleSave}>
                                    บันทึก
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FollowUp;
