import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Save, ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { InspectionItem, InspectionRecord, InspectionStatus, INSPECTION_CATEGORIES, RESPONSIBLE_OPTIONS } from "@/types/inspection";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
const Inspection = () => {
    const navigate = useNavigate();
    const [inspectionData, setInspectionData] = useState<any>(null);
    const [items, setItems] = useState<InspectionItem[]>([]);
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [newItemName, setNewItemName] = useState("");
    const [showAddItemDialog, setShowAddItemDialog] = useState(false);

    const categories = Object.entries(INSPECTION_CATEGORIES);
    const [currentCategoryKey, currentCategory] = categories[currentCategoryIndex];

    useEffect(() => {
        const data = localStorage.getItem("current_inspection");
        if (!data) {
            toast.error("ไม่พบข้อมูลการตรวจ กรุณากรอกแบบฟอร์มก่อน");
            navigate("/form");
            return;
        }
        setInspectionData(JSON.parse(data));
        initializeItems();
    }, [navigate]);

    const initializeItems = () => {
        const allItems: InspectionItem[] = [];
        Object.entries(INSPECTION_CATEGORIES).forEach(([key, category]) => {
            category.items.forEach((item, index) => {
                allItems.push({
                    id: `${key}_${index}`,
                    category: category.name,
                    name: item,
                    status: "normal",
                    isCustom: false,
                });
            });
        });
        setItems(allItems);
    };

    // // Create corrective action in real-time when item is marked as abnormal
    // const createCorrectiveAction = useCallback(async (item: InspectionItem) => {
    //     if (!inspectionData) return;

    //     try {
    //         // Generate proper UUIDs
    //         const correctiveActionId = crypto.randomUUID();
    //         const tempInspectionId = crypto.randomUUID();

    //         const { error } = await supabase.from("corrective_actions").insert({
    //             id: correctiveActionId,
    //             inspection_id: tempInspectionId,
    //             item_id: item.id,
    //             building: inspectionData.building,
    //             division: inspectionData.division,
    //             department: inspectionData.department,
    //             category: item.category,
    //             item_name: item.name,
    //             responsible: item.responsible || "ไม่ระบุ",
    //             status: "กำลังตรวจสอบ",
    //             is_new: true,
    //             inspection_details: item.details || null,
    //             inspection_recommendations: item.recommendations || null,
    //             inspection_images: item.images || [],
    //         });

    //         if (error) {
    //             console.error("Error creating corrective action:", error);
    //             toast.error("ไม่สามารถบันทึกรายการติดตามแก้ไขได้");
    //         } else {
    //             toast.info(`ส่งรายการ "${item.name}" ไปติดตามแก้ไขแล้ว`);
    //         }
    //     } catch (error) {
    //         console.error("Error creating corrective action:", error);
    //         toast.error("เกิดข้อผิดพลาดในการบันทึก");
    //     }
    // }, [inspectionData]);

    // // Delete corrective action when item is no longer abnormal
    // const deleteCorrectiveAction = useCallback(async (itemId: string) => {
    //     try {
    //         const { error } = await supabase
    //             .from("corrective_actions")
    //             .delete()
    //             .like("item_id", itemId);

    //         if (error) {
    //             console.error("Error deleting corrective action:", error);
    //         }
    //     } catch (error) {
    //         console.error("Error deleting corrective action:", error);
    //     }
    // }, []);

    // const updateItemStatus = async (id: string, status: InspectionStatus) => {
    //     const currentItem = items.find(item => item.id === id);

    //     setItems((prev) =>
    //         prev.map((item) => (item.id === id ? { ...item, status } : item))
    //     );

    //     // If marked as abnormal, create corrective action in real-time
    //     if (status === "abnormal" && currentItem) {
    //         await createCorrectiveAction({ ...currentItem, status });
    //     }
    //     // If changed from abnormal to something else, remove from corrective actions
    //     else if (currentItem?.status === "abnormal" && status !== "abnormal") {
    //         await deleteCorrectiveAction(id);
    //         toast.info(`ลบรายการ "${currentItem.name}" ออกจากติดตามแก้ไขแล้ว`);
    //     }
    // };

    const updateItemStatus = (id: string, status: InspectionStatus) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status } : item))
        );
    };

    const updateItemDetails = (id: string, field: keyof InspectionItem, value: any) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    // const updateItemDetails = async (id: string, field: keyof InspectionItem, value: any) => {
    //     setItems((prev) =>
    //         prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    //     );

    //     // Update corrective action in real-time if item is abnormal
    //     const currentItem = items.find(item => item.id === id);
    //     if (currentItem?.status === "abnormal") {
    //         try {
    //             const updateData: any = {};
    //             if (field === "responsible") {
    //                 updateData.responsible = value || "ไม่ระบุ";
    //             }
    //             if (field === "details") {
    //                 updateData.inspection_details = value;
    //             }
    //             if (field === "recommendations") {
    //                 updateData.inspection_recommendations = value;
    //             }

    //             if (Object.keys(updateData).length > 0) {
    //                 await supabase
    //                     .from("corrective_actions")
    //                     .update(updateData)
    //                     .like("item_id", id);
    //             }
    //         } catch (error) {
    //             console.error("Error updating corrective action:", error);
    //         }
    //     }
    // };

    // const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    //     const files = e.target.files;
    //     if (files) {
    //         const fileArray = Array.from(files);
    //         const imageUrls: string[] = [];

    //         fileArray.forEach((file) => {
    //             const reader = new FileReader();
    //             reader.onloadend = async () => {
    //                 imageUrls.push(reader.result as string);
    //                 if (imageUrls.length === fileArray.length) {
    //                     setItems((prev) =>
    //                         prev.map((item) =>
    //                             item.id === id
    //                                 ? { ...item, images: [...(item.images || []), ...imageUrls] }
    //                                 : item
    //                         )
    //                     );

    //                     // Update corrective action with images if item is abnormal
    //                     const currentItem = items.find(item => item.id === id);
    //                     if (currentItem?.status === "abnormal") {
    //                         try {
    //                             await supabase
    //                                 .from("corrective_actions")
    //                                 .update({ inspection_images: [...(currentItem.images || []), ...imageUrls] })
    //                                 .like("item_id", id);
    //                         } catch (error) {
    //                             console.error("Error updating inspection images:", error);
    //                         }
    //                     }
    //                 }
    //             };
    //             reader.readAsDataURL(file);
    //         });
    //     }
    // };

    const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const fileArray = Array.from(files);
            const imageUrls: string[] = [];

            fileArray.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    imageUrls.push(reader.result as string);
                    if (imageUrls.length === fileArray.length) {
                        setItems((prev) =>
                            prev.map((item) =>
                                item.id === id
                                    ? { ...item, images: [...(item.images || []), ...imageUrls] }
                                    : item
                            )
                        );
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const addCustomItem = () => {
        if (!newItemName.trim()) {
            toast.error("กรุณากรอกชื่อรายการตรวจ");
            return;
        }

        const newItem: InspectionItem = {
            id: `custom_${currentCategoryKey}_${Date.now()}`,
            category: currentCategory.name,
            name: newItemName,
            status: "normal",
            isCustom: true,
        };

        setItems((prev) => [...prev, newItem]);
        setNewItemName("");
        setShowAddItemDialog(false);
        toast.success("เพิ่มรายการตรวจใหม่แล้ว");
    };

    const handleNext = () => {
        if (currentCategoryIndex < categories.length - 1) {
            setCurrentCategoryIndex(currentCategoryIndex + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrevious = () => {
        if (currentCategoryIndex > 0) {
            setCurrentCategoryIndex(currentCategoryIndex - 1);
            window.scrollTo(0, 0);
        }
    };

    // const handleSave = async () => {
    //     if (!inspectionData) return;

    //     try {
    //         const { data: user } = await supabase.auth.getUser();

    //         // Remove images from items to avoid storage issues (images are too large for JSON storage)
    //         const itemsWithoutImages = items.map(item => ({
    //             ...item,
    //             images: undefined, // Don't store base64 images in database
    //         }));

    //         const inspectionId = crypto.randomUUID();

    //         const { error } = await supabase.from("inspections").insert({
    //             id: inspectionId,
    //             user_id: user.user?.id,
    //             date: inspectionData.date,
    //             time: new Date().toLocaleTimeString('th-TH'),
    //             building: inspectionData.building,
    //             division: inspectionData.division,
    //             department: inspectionData.department,
    //             inspector_name: inspectionData.surveyTeam?.join(", ") || '',
    //             items: itemsWithoutImages,
    //         });

    //         if (error) throw error;

    //         localStorage.removeItem("current_inspection");
    //         toast.success("บันทึกผลการตรวจสำเร็จ");
    //         navigate("/");
    //     } catch (error: any) {
    //         console.error("Error saving inspection:", error);
    //         toast.error("ไม่สามารถบันทึกผลการตรวจได้: " + error.message);
    //     }
    // };

    const handleSave = async () => {
        if (!inspectionData) return;

        try {
            const { data: authData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            // ใช้ id เดียวกันสำหรับทั้ง inspections และ corrective_actions
            const inspectionId = crypto.randomUUID();

            // ไม่เก็บ base64 ลง inspections.items
            const itemsWithoutImages = items.map((item) => ({
                ...item,
                images: undefined,
            }));

            // 1) บันทึก inspections
            const { error: inspError } = await supabase.from("inspections").insert({
                id: inspectionId,
                user_id: authData.user?.id,
                date: inspectionData.date,
                time: new Date().toLocaleTimeString("th-TH"),
                building: inspectionData.building,
                floor: inspectionData.floor,
                division: inspectionData.division,
                department: inspectionData.department,
                inspector_name: inspectionData.surveyTeam?.join(", ") || "",
                items: itemsWithoutImages,
            });

            if (inspError) throw inspError;

            // 2) บันทึก corrective_actions เฉพาะรายการที่ "ไม่ปกติ"
            const abnormalItems = items.filter((item) => item.status === "abnormal");

            if (abnormalItems.length > 0) {
                const correctivePayload = abnormalItems.map((item) => ({
                    inspection_id: inspectionId,
                    item_id: item.id,
                    building: inspectionData.building,
                    division: inspectionData.division,
                    department: inspectionData.department,
                    category: item.category,
                    item_name: item.name,
                    responsible: item.responsible || "ไม่ระบุ",
                    status: "กำลังตรวจสอบ" as const,
                    is_new: true,
                    inspection_details: item.details || null,
                    inspection_recommendations: item.recommendations || null,
                    inspection_images: (item.images || []) as unknown as Json
                }));

                const { error: caError } = await supabase
                    .from("corrective_actions")
                    .insert(correctivePayload);

                if (caError) throw caError;
            }

            localStorage.removeItem("current_inspection");
            toast.success("บันทึกผลการตรวจสำเร็จ");
            navigate("/");
        } catch (error: any) {
            console.error("Error saving inspection:", error);
            toast.error("ไม่สามารถบันทึกผลการตรวจได้: " + error.message);
        }
    };

    if (!inspectionData) return null;

    const currentCategoryItems = items.filter((item) => item.category === currentCategory.name);

    return (
        <div className="min-h-screen bg-background p-4 pb-32">
            <div className="mx-auto max-w-3xl">
                <div className="mb-6 rounded-lg bg-card p-4 shadow">
                    <h1 className="text-xl font-bold text-foreground">รายการตรวจสอบ</h1>
                    <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                        <p>
                            <span className="font-medium">วันที่:</span> {inspectionData.date}
                        </p>
                        <p>
                            <span className="font-medium">อาคาร:</span> {inspectionData.building} ชั้น {inspectionData.floor}
                        </p>
                        <p>
                            <span className="font-medium">หน่วยงาน:</span> {inspectionData.division}
                            {inspectionData.department && ` - ${inspectionData.department}`}
                        </p>
                    </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        ด้านที่ {currentCategoryIndex + 1} จาก {categories.length}
                    </div>
                    <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่มรายการตรวจใหม่
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>เพิ่มรายการตรวจใหม่ใน{currentCategory.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>ชื่อรายการตรวจ</Label>
                                    <Input
                                        placeholder="ระบุรายการตรวจ"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                    />
                                </div>
                                <Button onClick={addCustomItem} className="w-full">
                                    เพิ่ม
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="overflow-hidden">
                    <div className="sticky top-0 z-10 bg-primary p-4">
                        <h2 className="text-lg font-bold text-primary-foreground">
                            {currentCategory.name}
                            <span className="ml-2 text-sm font-normal opacity-90">
                                ({currentCategoryItems.length} รายการ)
                            </span>
                        </h2>
                    </div>
                    <div className="space-y-4 p-4">
                        {currentCategoryItems.map((item) => (
                            <Card key={item.id} className="border-l-4 border-l-primary/50 p-4">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <p className="font-medium text-foreground">{item.name}</p>
                                        {item.isCustom && (
                                            <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                                                รายการเพิ่มเติม
                                            </span>
                                        )}
                                    </div>

                                    <RadioGroup
                                        value={item.status}
                                        onValueChange={(value) => updateItemStatus(item.id, value as InspectionStatus)}
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="normal" id={`${item.id}-normal`} />
                                                <Label htmlFor={`${item.id}-normal`} className="font-normal">
                                                    ปกติ
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="abnormal" id={`${item.id}-abnormal`} />
                                                <Label htmlFor={`${item.id}-abnormal`} className="font-normal">
                                                    ไม่ปกติ
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="not_relevant" id={`${item.id}-not_relevant`} />
                                                <Label htmlFor={`${item.id}-not_relevant`} className="font-normal">
                                                    ไม่เกี่ยวข้อง
                                                </Label>
                                            </div>
                                        </div>
                                    </RadioGroup>

                                    {item.status === "abnormal" && (
                                        <div className="space-y-3 rounded-lg bg-destructive/10 p-3">
                                            <div className="space-y-2">
                                                <Label htmlFor={`${item.id}-details`}>รายละเอียด</Label>
                                                <Textarea
                                                    id={`${item.id}-details`}
                                                    placeholder="อธิบายปัญหาที่พบ..."
                                                    value={item.details || ""}
                                                    onChange={(e) => updateItemDetails(item.id, "details", e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`${item.id}-recommendations`}>ข้อเสนอแนะ/การแก้ไข</Label>
                                                <Textarea
                                                    id={`${item.id}-recommendations`}
                                                    placeholder="ข้อเสนอแนะในการแก้ไข..."
                                                    value={item.recommendations || ""}
                                                    onChange={(e) => updateItemDetails(item.id, "recommendations", e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`${item.id}-responsible`}>ผู้รับผิดชอบ</Label>
                                                <Select
                                                    value={item.responsible || ""}
                                                    onValueChange={(value) => updateItemDetails(item.id, "responsible", value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {RESPONSIBLE_OPTIONS.map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {item.responsible === "อื่นๆ (ระบุ)" && (
                                                <div className="space-y-2">
                                                    <Label htmlFor={`${item.id}-responsible-other`}>ระบุผู้รับผิดชอบ</Label>
                                                    <Input
                                                        id={`${item.id}-responsible-other`}
                                                        placeholder="ระบุผู้รับผิดชอบ"
                                                        value={item.responsibleOther || ""}
                                                        onChange={(e) => updateItemDetails(item.id, "responsibleOther", e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label>แนบรูปภาพ</Label>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => document.getElementById(`${item.id}-image`)?.click()}
                                                    >
                                                        <Camera className="mr-2 h-4 w-4" />
                                                        เพิ่มรูปภาพ
                                                    </Button>
                                                    <input
                                                        id={`${item.id}-image`}
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload(item.id, e)}
                                                    />
                                                </div>
                                                {item.images && item.images.length > 0 && (
                                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                                        {item.images.map((img, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={img}
                                                                alt={`รูปที่ ${idx + 1}`}
                                                                className="h-20 w-full rounded object-cover"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>

                <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
                    <div className="mx-auto flex max-w-3xl gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handlePrevious}
                            disabled={currentCategoryIndex === 0}
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            ย้อนกลับ
                        </Button>
                        {currentCategoryIndex < categories.length - 1 ? (
                            <Button className="flex-1" onClick={handleNext}>
                                ถัดไป
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button className="flex-1" onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" />
                                บันทึกผลการตรวจ
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inspection;
