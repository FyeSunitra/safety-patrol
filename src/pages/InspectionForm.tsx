import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Plus, Search } from "lucide-react";
import { BUILDINGS } from "@/types/inspection";
import { DIVISIONS } from "@/data/divisions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SURVEY_TEAM_OPTIONS = ["พิมพ์", "เนย", "จูน", "ดาว", "เดียร์", "อื่นๆ (โปรดระบุ)"];

const InspectionForm = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    // All hooks must be called before any conditional returns
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [surveyTeam, setSurveyTeam] = useState("");
    const [customSurveyTeam, setCustomSurveyTeam] = useState("");
    const [building, setBuilding] = useState("");
    const [customBuilding, setCustomBuilding] = useState("");
    const [customBuildings, setCustomBuildings] = useState<string[]>([]);
    const [floor, setFloor] = useState("");
    const [division, setDivision] = useState("");
    const [customDivision, setCustomDivision] = useState("");
    const [department, setDepartment] = useState("");
    const [customDepartment, setCustomDepartment] = useState("");
    const [showBuildingDialog, setShowBuildingDialog] = useState(false);
    const [showDivisionDialog, setShowDivisionDialog] = useState(false);
    const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
    const [buildingSearch, setBuildingSearch] = useState("");
    const [divisionSearch, setDivisionSearch] = useState("");
    const [departmentSearch, setDepartmentSearch] = useState("");
    const [openBuildingPopover, setOpenBuildingPopover] = useState(false);
    const [openDivisionPopover, setOpenDivisionPopover] = useState(false);
    const [openDepartmentPopover, setOpenDepartmentPopover] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    // Load custom buildings from localStorage on mount
    useEffect(() => {
        const savedBuildings = localStorage.getItem("custom_buildings");
        if (savedBuildings) {
            setCustomBuildings(JSON.parse(savedBuildings));
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const selectedDivisionData = DIVISIONS.find((d) => d.id === division);
    const allBuildings = [...BUILDINGS, ...customBuildings];
    const allDivisions = DIVISIONS;

    const filteredBuildings = allBuildings.filter((b) =>
        b.toLowerCase().includes(buildingSearch.toLowerCase())
    );

    const filteredDivisions = allDivisions.filter((d) =>
        d.name.toLowerCase().includes(divisionSearch.toLowerCase())
    );

    const filteredDepartments = selectedDivisionData?.departments.filter((dept) =>
        dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
    ) || [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const finalSurveyTeam = surveyTeam === "อื่นๆ (โปรดระบุ)" ? customSurveyTeam : surveyTeam;

        if (!date || !finalSurveyTeam || (!building && !customBuilding) || !floor || (!division && !customDivision)) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        const inspectionData = {
            date,
            surveyTeam: [finalSurveyTeam],
            building: building || customBuilding,
            floor,
            division: division || customDivision,
            department: department || customDepartment,
        };

        localStorage.setItem("current_inspection", JSON.stringify(inspectionData));
        toast.success("บันทึกข้อมูลเรียบร้อย กรุณาทำการตรวจสอบ");
        navigate("/inspection");
    };

    const addCustomBuilding = () => {
        if (customBuilding.trim()) {
            const newBuilding = customBuilding.trim();
            // Save to localStorage permanently
            const updatedBuildings = [...customBuildings, newBuilding];
            setCustomBuildings(updatedBuildings);
            localStorage.setItem("custom_buildings", JSON.stringify(updatedBuildings));
            // Set as current selection
            setBuilding(newBuilding);
            setCustomBuilding("");
            setShowBuildingDialog(false);
            toast.success("เพิ่มอาคารใหม่แล้ว");
        }
    };

    const addCustomDivision = () => {
        if (customDivision.trim()) {
            setDivision("");
            setShowDivisionDialog(false);
            toast.success("เพิ่มหน่วยงานหลักใหม่แล้ว");
        }
    };

    const addCustomDepartment = () => {
        if (customDepartment.trim()) {
            setDepartment("");
            setShowDepartmentDialog(false);
            toast.success("เพิ่มหน่วยงานย่อยใหม่แล้ว");
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-2xl">
                <div className="mb-4">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        ← กลับหน้าแดชบอร์ด
                    </Button>
                </div>
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-full bg-primary p-3">
                        <ClipboardList className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">แบบสำรวจความปลอดภัยในการทำงาน</h1>
                        <p className="text-sm text-muted-foreground">Safety Patrol</p>
                    </div>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="date">วันที่สำรวจ *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="surveyTeam">คณะผู้สำรวจ *</Label>
                            <Select value={surveyTeam} onValueChange={setSurveyTeam}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกผู้สำรวจ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SURVEY_TEAM_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {surveyTeam === "อื่นๆ (โปรดระบุ)" && (
                                <Input
                                    placeholder="ระบุชื่อผู้สำรวจ"
                                    value={customSurveyTeam}
                                    onChange={(e) => setCustomSurveyTeam(e.target.value)}
                                    className="mt-2"
                                    required
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>อาคาร *</Label>
                                <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            เพิ่มอาคารใหม่
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>เพิ่มอาคารใหม่</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <Input
                                                placeholder="ชื่ออาคาร"
                                                value={customBuilding}
                                                onChange={(e) => setCustomBuilding(e.target.value)}
                                            />
                                            <Button onClick={addCustomBuilding} className="w-full">
                                                เพิ่ม
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            {customBuilding ? (
                                <div className="rounded-md border border-primary bg-primary/10 p-3">
                                    <p className="text-sm font-medium text-primary">{customBuilding}</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCustomBuilding("")}
                                        className="mt-2"
                                    >
                                        เปลี่ยนแปลง
                                    </Button>
                                </div>
                            ) : (
                                <Popover open={openBuildingPopover} onOpenChange={setOpenBuildingPopover}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            {building || "เลือกอาคาร"}
                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="ค้นหาอาคาร..."
                                                value={buildingSearch}
                                                onValueChange={setBuildingSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>ไม่พบอาคาร</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredBuildings.map((b) => (
                                                        <CommandItem
                                                            key={b}
                                                            value={b}
                                                            onSelect={() => {
                                                                setBuilding(b);
                                                                setOpenBuildingPopover(false);
                                                                setBuildingSearch("");
                                                            }}
                                                        >
                                                            {b}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="floor">ชั้น *</Label>
                            <Input
                                id="floor"
                                placeholder="เช่น 1, 2, 3"
                                value={floor}
                                onChange={(e) => setFloor(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>หน่วยงานหลัก *</Label>
                                <Dialog open={showDivisionDialog} onOpenChange={setShowDivisionDialog}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            เพิ่มหน่วยงานใหม่
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>เพิ่มหน่วยงานหลักใหม่</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <Input
                                                placeholder="ชื่อหน่วยงานหลัก"
                                                value={customDivision}
                                                onChange={(e) => setCustomDivision(e.target.value)}
                                            />
                                            <Button onClick={addCustomDivision} className="w-full">
                                                เพิ่ม
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            {customDivision ? (
                                <div className="rounded-md border border-primary bg-primary/10 p-3">
                                    <p className="text-sm font-medium text-primary">{customDivision}</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCustomDivision("")}
                                        className="mt-2"
                                    >
                                        เปลี่ยนแปลง
                                    </Button>
                                </div>
                            ) : (
                                <Popover open={openDivisionPopover} onOpenChange={setOpenDivisionPopover}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            {division ? allDivisions.find((d) => d.id === division)?.name : "เลือกหน่วยงานหลัก"}
                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="ค้นหาหน่วยงาน..."
                                                value={divisionSearch}
                                                onValueChange={setDivisionSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredDivisions.map((d) => (
                                                        <CommandItem
                                                            key={d.id}
                                                            value={d.name}
                                                            onSelect={() => {
                                                                setDivision(d.id);
                                                                setDepartment("");
                                                                setOpenDivisionPopover(false);
                                                                setDivisionSearch("");
                                                            }}
                                                        >
                                                            {d.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        {selectedDivisionData && selectedDivisionData.departments.length > 0 && !customDivision && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>หน่วยงานย่อย</Label>
                                    <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" size="sm">
                                                <Plus className="mr-2 h-4 w-4" />
                                                เพิ่มหน่วยงานย่อย
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>เพิ่มหน่วยงานย่อยใหม่</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 pt-4">
                                                <Input
                                                    placeholder="ชื่อหน่วยงานย่อย"
                                                    value={customDepartment}
                                                    onChange={(e) => setCustomDepartment(e.target.value)}
                                                />
                                                <Button onClick={addCustomDepartment} className="w-full">
                                                    เพิ่ม
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                {customDepartment ? (
                                    <div className="rounded-md border border-primary bg-primary/10 p-3">
                                        <p className="text-sm font-medium text-primary">{customDepartment}</p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCustomDepartment("")}
                                            className="mt-2"
                                        >
                                            เปลี่ยนแปลง
                                        </Button>
                                    </div>
                                ) : (
                                    <Popover open={openDepartmentPopover} onOpenChange={setOpenDepartmentPopover}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between"
                                            >
                                                {department ? selectedDivisionData?.departments.find((d) => d.id === department)?.name : "เลือกหน่วยงานย่อย"}
                                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder="ค้นหาหน่วยงานย่อย..."
                                                    value={departmentSearch}
                                                    onValueChange={setDepartmentSearch}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>ไม่พบหน่วยงานย่อย</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredDepartments.map((dept) => (
                                                            <CommandItem
                                                                key={dept.id}
                                                                value={dept.name}
                                                                onSelect={() => {
                                                                    setDepartment(dept.id);
                                                                    setOpenDepartmentPopover(false);
                                                                    setDepartmentSearch("");
                                                                }}
                                                            >
                                                                {dept.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                        )}

                        <Button type="submit" className="w-full" size="lg">
                            เริ่มการตรวจสอบ
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default InspectionForm;
