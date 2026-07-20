import { EmailValidator } from "@/components/email-validator/email-validator";
import { DesktopOnlineGate } from "@/components/desktop/desktop-online-gate";
export default function EmailValidatorPage() {
    return (
        <DesktopOnlineGate toolName="Email Validator">
            <div className="h-full w-full min-h-0 p-2 md:p-4">
                <EmailValidator />
            </div>
        </DesktopOnlineGate>
    );
}
