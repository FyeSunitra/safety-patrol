import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import * as exifr from "exifr";
import type { InspectionRecord } from "@/types/inspection";

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
  return Array.from(new Set(images));
};

async function fetchImageAsBase64(url: string): Promise<string> {
  // ดึง blob รูปจาก URL
  const res = await fetch(url);
  const blob = await res.blob();

  // สร้าง <img> เพื่อให้ browser decode + หมุนให้ถูกก่อน
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(blob);
  });

  // ใช้ขนาดรูปตามที่ browser แสดง (หลังจากจัด orientation แล้ว)
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // วาดรูปลง canvas แบบไม่หมุนอะไรเพิ่ม
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // เคลียร์ URL ชั่วคราว
  URL.revokeObjectURL(img.src);

  // แปลง canvas → base64 (jpeg)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  return dataUrl;
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

    const anchorRowBase = row.number - 1;
    const anchorColBase = imageColIndex - 1;

    const colStep = 1.2;
    row.height = 140;

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
            row: anchorRowBase + 0.1,
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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `SafetyPatrol_${inspection.date}_${
    divisionName || inspection.division
  }.xlsx`;
  saveAs(blob, filename);
}
