import { FieldValue, Timestamp } from "firebase/firestore";

export interface Project {
    id: string;
    name: string;
    color: string;
    created_by: string;
    createdAt: string;
}

export interface NewProject {
    name: string;
    color: string;
    created_by: string;
    createdAt: FieldValue | Timestamp;
}
