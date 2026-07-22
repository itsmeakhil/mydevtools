// URL kept alive: shipped desktop builds hard-open /account/plan.
import { redirect } from 'next/navigation'

export default function AccountPlanPage() {
  redirect('/dashboard')
}
