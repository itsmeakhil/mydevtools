import { EmailValidator } from "@/components/email-validator/email-validator";
import { DesktopOnlineGate } from "@/components/desktop/desktop-online-gate";
export default function EmailValidatorPage() {
    return (
        <DesktopOnlineGate toolName="Email Validator">
            <EmailValidator />
        </DesktopOnlineGate>
    );
}
