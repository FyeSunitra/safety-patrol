import { InspectionRecord } from "@/types/inspection";

export const generatePDF = (
  inspection: InspectionRecord,
  divisionName?: string,
  departmentName?: string
) => {
  const abnormalItems = inspection.items.filter(
    (item) => item.status === "abnormal"
  );
  const normalItems = inspection.items.filter(
    (item) => item.status === "normal"
  );
  const notRelevantItems = inspection.items.filter(
    (item) => item.status === "not_relevant"
  );

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: "Sarabun", "Tahoma", sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .info-section {
          margin-bottom: 20px;
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          width: 150px;
        }
        .summary {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
        }
        .summary-card {
          flex: 1;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-card.normal {
          background-color: #dcfce7;
          color: #166534;
        }
        .summary-card.abnormal {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .summary-card.not-relevant {
          background-color: #f3f4f6;
          color: #374151;
        }
        .summary-number {
          font-size: 32px;
          font-weight: bold;
        }
        .summary-label {
          font-size: 14px;
          margin-top: 5px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #991b1b;
        }
        .item {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .item-title {
          font-weight: bold;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }
        .item-category {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
        }
        .item-detail {
          margin-bottom: 10px;
        }
        .item-detail-label {
          font-weight: bold;
          color: #666;
          margin-bottom: 5px;
        }
        .item-detail-content {
          color: #444;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .image-cell img {
          max-width: 150px;
          max-height: 150px;
          object-fit: cover;
          margin: 2px;
          border-radius: 4px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
        }
        .status-normal {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-abnormal {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .status-not-relevant {
          background-color: #f3f4f6;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>สรุปผลแบบสำรวจความปลอดภัยในการทำงาน (Safety Patrol)</h1>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div class="info-label">หน่วยงาน:</div>
          <div>${divisionName || inspection.division}${
    departmentName ? ` - ${departmentName}` : ""
  }</div>
        </div>
        <div class="info-row">
          <div class="info-label">อาคาร:</div>
          <div>${inspection.building} (ชั้น ${inspection.floor})</div>
        </div>
        <div class="info-row">
          <div class="info-label">วันที่สำรวจ:</div>
          <div>${inspection.date}</div>
        </div>
        <div class="info-row">
          <div class="info-label">คณะผู้สำรวจ:</div>
          <div>${inspection.surveyTeam.join(", ")}</div>
        </div>
      </div>

      <div class="summary">
        <div class="summary-card normal">
          <div class="summary-number">${normalItems.length}</div>
          <div class="summary-label">ปกติ</div>
        </div>
        <div class="summary-card abnormal">
          <div class="summary-number">${abnormalItems.length}</div>
          <div class="summary-label">ไม่ปกติ</div>
        </div>
        <div class="summary-card not-relevant">
          <div class="summary-number">${notRelevantItems.length}</div>
          <div class="summary-label">ไม่เกี่ยวข้อง</div>
        </div>
      </div>

      ${
        abnormalItems.length > 0
          ? `
      <div class="section">
        <div class="section-title">รายการที่พบปัญหา</div>
        ${abnormalItems
          .map(
            (item, index) => `
          <div class="item">
            <div class="item-title">
              <span>${index + 1}. ${item.name}</span>
              <span class="item-category">${item.category}</span>
            </div>
            ${
              item.details
                ? `
            <div class="item-detail">
              <div class="item-detail-label">รายละเอียด:</div>
              <div class="item-detail-content">${item.details}</div>
            </div>
            `
                : ""
            }
            ${
              item.recommendations
                ? `
            <div class="item-detail">
              <div class="item-detail-label">ข้อเสนอแนะ/การแก้ไข:</div>
              <div class="item-detail-content">${item.recommendations}</div>
            </div>
            `
                : ""
            }
            ${
              item.responsible
                ? `
            <div class="item-detail">
              <div class="item-detail-label">ผู้รับผิดชอบ:</div>
              <div class="item-detail-content">${item.responsible}</div>
            </div>
            `
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
      `
          : ""
      }

      <div class="section">
        <div class="section-title" style="color: #333;">รายการตรวจทั้งหมด</div>
        <table>
          <thead>
            <tr>
              <th>หมวดหมู่</th>
              <th>รายการตรวจ</th>
              <th style="text-align: center;">สถานะ</th>
              <th style="width: 200px;">หมายเหตุและรูปภาพ</th>
            </tr>
          </thead>
          <tbody>
            ${inspection.items
              .map(
                (item) => `
              <tr>
                <td>${item.category}</td>
                <td>${item.name}</td>
                <td style="text-align: center;">
                  <span class="status-badge status-${
                    item.status === "normal"
                      ? "normal"
                      : item.status === "abnormal"
                      ? "abnormal"
                      : "not-relevant"
                  }">
                    ${
                      item.status === "normal"
                        ? "ปกติ"
                        : item.status === "abnormal"
                        ? "ไม่ปกติ"
                        : "ไม่เกี่ยวข้อง"
                    }
                  </span>
                </td>
                <td class="image-cell">
                  ${
                    item.details
                      ? `<p style="margin-bottom: 8px; font-size: 12px;"><strong>หมายเหตุ:</strong> ${item.details}</p>`
                      : ""
                  }
                  ${
                    item.recommendations
                      ? `<p style="margin-bottom: 8px; font-size: 12px;"><strong>ข้อเสนอแนะ:</strong> ${item.recommendations}</p>`
                      : ""
                  }
                  ${
                    item.images && item.images.length > 0
                      ? `<div>
                        ${item.images
                          .map((img) => `<img src="${img}" alt="ภาพประกอบ" />`)
                          .join("")}
                      </div>`
                      : ""
                  }
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  // Create a new window and print
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
