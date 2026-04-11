import { EmailValidator } from "@/components/email-validator/email-validator";
import { generateToolMetadata } from "@/lib/metadata";

export const metadata = generateToolMetadata('email-validator')

export default function EmailValidatorPage() {
    return <EmailValidator />;
}
