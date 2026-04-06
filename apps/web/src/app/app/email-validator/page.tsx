import { EmailValidator } from "@/components/email-validator/email-validator";

export const metadata = {
    title: "Email Validator - MyDevTools",
    description: "Verify and validate email addresses online.",
};

export default function EmailValidatorPage() {
    return <EmailValidator />;
}
