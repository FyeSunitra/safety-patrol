import { InspectionRecord } from "@/types/inspection";

const STORAGE_KEY = "safety_patrol_inspections";

export const saveInspection = (inspection: InspectionRecord): void => {
  const inspections = getAllInspections();
  const existingIndex = inspections.findIndex((i) => i.id === inspection.id);

  if (existingIndex >= 0) {
    inspections[existingIndex] = inspection;
  } else {
    inspections.push(inspection);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));

  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new Event("inspectionUpdated"));
};

export const getAllInspections = (): InspectionRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getInspectionById = (id: string): InspectionRecord | undefined => {
  const inspections = getAllInspections();
  return inspections.find((i) => i.id === id);
};

export const deleteInspection = (id: string): void => {
  const inspections = getAllInspections();
  const filtered = inspections.filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getInspectionStats = () => {
  const inspections = getAllInspections();

  const buildingStats: Record<string, { total: number; abnormal: number }> = {};
  const divisionStats: Record<string, { total: number; abnormal: number }> = {};
  const categoryStats: Record<string, { total: number; abnormal: number }> = {};

  inspections.forEach((inspection) => {
    // Building stats
    if (!buildingStats[inspection.building]) {
      buildingStats[inspection.building] = { total: 0, abnormal: 0 };
    }
    buildingStats[inspection.building].total++;

    // Division stats
    if (!divisionStats[inspection.division]) {
      divisionStats[inspection.division] = { total: 0, abnormal: 0 };
    }
    divisionStats[inspection.division].total++;

    // Category and abnormal counts
    inspection.items.forEach((item) => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { total: 0, abnormal: 0 };
      }
      categoryStats[item.category].total++;

      if (item.status === "abnormal") {
        buildingStats[inspection.building].abnormal++;
        divisionStats[inspection.division].abnormal++;
        categoryStats[item.category].abnormal++;
      }
    });
  });

  return {
    buildingStats,
    divisionStats,
    categoryStats,
    totalInspections: inspections.length,
  };
};
