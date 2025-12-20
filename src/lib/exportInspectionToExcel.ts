import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { InspectionRecord } from "@/types/inspection";
// รวมรูปทุกแหล่งของ item แล้ว "ลบรูปซ้ำ"
const getAllImagesForItem = (item: any): string[] => {
  const images: string[] = [];

  if (Array.isArray(item.images)) {
    images.push(...item.images);
  }
  if (Array.isArray(item.inspection_images)) {
    images.push(...item.inspection_images);
  }
  if (Array.isArray(item.action_images)) {
    images.push(...item.action_images);
  }
  if (Array.isArray(item.corrective_actions)) {
    item.corrective_actions.forEach((ca: any) => {
      if (Array.isArray(ca.inspection_images)) {
        images.push(...ca.inspection_images);
      }
      if (Array.isArray(ca.action_images)) {
        images.push(...ca.action_images);
      }
    });
  }

  // 🔥 ตรงนี้สำคัญ: ตัดรูปที่ URL ซ้ำ ๆ ออก
  return Array.from(new Set(images));
};

// helper ดึงรูปจาก URL → เป็น base64 สำหรับ exceljs
async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportInspectionToExcel(
  inspection: InspectionRecord,
  divisionName?: string,
  departmentName?: string
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Safety Patrol");

  sheet.columns = [
    { header: "วันที่", key: "date", width: 12 },
    { header: "อาคาร", key: "building", width: 15 },
    { header: "ชั้น", key: "floor", width: 10 },
    { header: "หน่วยงานหลัก", key: "division", width: 25 },
    { header: "หน่วยงานย่อย", key: "department", width: 25 },
    { header: "หมวดหมู่", key: "category", width: 20 },
    { header: "รายการตรวจ", key: "name", width: 40 },
    { header: "สถานะ", key: "status", width: 12 },
    { header: "รายละเอียด", key: "detail", width: 40 },
    { header: "ข้อเสนอแนะ", key: "recommend", width: 40 },
    { header: "ผู้รับผิดชอบ", key: "responsible", width: 25 },
    { header: "คณะผู้สำรวจ", key: "team", width: 30 },
    { header: "รูปภาพ", key: "images", width: 25 },
  ];

  sheet.getRow(1).font = { bold: true };

  const imageColIndex = 13;
  const thumbSize = 140;

  for (const item of inspection.items) {
    const statusText =
      item.status === "normal"
        ? "ปกติ"
        : item.status === "abnormal"
        ? "ไม่ปกติ"
        : "ไม่เกี่ยวข้อง";

    const imageUrls = getAllImagesForItem(item);

    const detailText = item.details || "-";

    // แถวหลักของ item
    const row = sheet.addRow({
      date: inspection.date,
      building: inspection.building,
      floor: inspection.floor || "-",
      division: divisionName || inspection.division,
      department: departmentName || "",
      category: item.category,
      name: item.name,
      status: statusText,
      detail: detailText,
      recommend: item.recommendations || "-",
      responsible: item.responsible || "-",
      team: inspection.surveyTeam.join("; "),
      images: imageUrls.length ? "" : "-",
    });

    if (imageUrls.length === 0) continue;

    const anchorRowBase = row.number - 1; // 0-based
    const anchorColBase = imageColIndex - 1; // 0-based

    const colStep = 1.2; // ระยะห่างแนวนอน (ลองปรับ 1.0 – 2.0 ได้)
    row.height = 140; // ให้แถวสูงพอกับรูป (จะได้เห็นเต็ม)

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      try {
        const base64 = await fetchImageAsBase64(url);
        const imageId = workbook.addImage({
          base64,
          extension: "jpeg",
        });

        sheet.addImage(imageId, {
          tl: {
            col: anchorColBase + 0.1 + i * colStep,
            row: anchorRowBase + 0.1, // แถวเดียวกัน
          },
          ext: {
            width: thumbSize,
            height: thumbSize,
          },
          editAs: "oneCell",
        });
      } catch (e) {
        console.error("ใส่รูปใน Excel ไม่สำเร็จ:", e);
      }
    }
  }

  // สร้างไฟล์ .xlsx แล้วให้ browser ดาวน์โหลด
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `SafetyPatrol_${inspection.date}_${
    divisionName || inspection.division
  }.xlsx`;
  saveAs(blob, filename);
}
