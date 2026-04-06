import { Task } from "@/app/app/to-do/types/Task";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";

// Helper to flatten task data for export
const formatTaskForExport = (task: Task) => {
    return {
        ID: task.id,
        Text: task.text,
        Description: task.description || "",
        Status: task.status,
        Priority: task.priority || "",
        "Due Date": task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : format(new Date(task.dueDate as any), "yyyy-MM-dd HH:mm")) : "",
        Tags: task.tags?.map((t) => t.name).join(", ") || "",
        "Subtasks Total": task.subTasks?.length || 0,
        "Subtasks Completed": task.subTasks?.filter((st) => st.completed).length || 0,
        "Created At": task.createdAt,
        "Completed At": task.completedAt || "",
        "Time Estimate (min)": task.timeEstimate || 0,
        "Time Logged (min)": task.timeLogged || 0,
        "Project ID": task.projectId || "",
    };
};

export const exportToExcel = (tasks: Task[], filename: string) => {
    const data = tasks.map(formatTaskForExport);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (tasks: Task[], filename: string) => {
    const data = tasks.map(formatTaskForExport);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${filename}.csv`);
};
