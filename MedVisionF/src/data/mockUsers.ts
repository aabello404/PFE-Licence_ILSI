import { User } from "../types";

export const mockUsers: User[] = [
  {
    id: "p1",
    firstName: "Yassine",
    lastName: "El Fassi",
    email: "yassine@example.com",

    role: "PATIENT",
  },
  {
    id: "p2",
    firstName: "Fatima",
    lastName: "Zahra",
    email: "fatima@example.com",

    role: "PATIENT",
  },
  {
    id: "d1",
    firstName: "Karim",
    lastName: "Benjelloun",
    email: "karim@medvision.ma",

    role: "DOCTOR",
    specialty: "Cardiology",
  },
  {
    id: "d2",
    firstName: "Amina",
    lastName: "Tazi",
    email: "amina@medvision.ma",
    role: "DOCTOR",
    specialty: "Neurology",
  },
  {
    id: "a1",
    firstName: "Admin",
    lastName: "System",
    email: "admin@medvision.ma",
    role: "ADMIN",
  },
  {
    id: "r1",
    firstName: "Sofia",
    lastName: "Bennis",
    email: "sofia@medvision.ma",

    role: "RECEPTIONIST",
  },
];
