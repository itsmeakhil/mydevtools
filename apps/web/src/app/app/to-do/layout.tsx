import { Fraunces } from "next/font/google";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata("to-do");

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT"],
});

export default function ToDoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${fraunces.variable} todo-app contents`}>{children}</div>;
}
