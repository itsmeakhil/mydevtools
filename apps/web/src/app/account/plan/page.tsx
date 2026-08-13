// URL kept alive: shipped desktop builds hard-open /account/plan.
// There are no accounts or plans any more — send it to the download page.
import { redirect } from 'next/navigation'

export default function AccountPlanPage() {
  redirect('/download')
}
