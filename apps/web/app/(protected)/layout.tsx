import AuthGuard from '@/components/AuthGuard'
import CollapsibleSidebar from '@/components/layout/CollapsibleSidebar'
import MobileTabBar from '@/components/layout/MobileTabBar'
import { Breadcrumb, BreadcrumbMobile } from '@/components/navigation'
import { SkipLink } from '@/components/accessibility'
import { WelcomeOnboarding } from '@/components/onboarding'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      {/* Global welcome onboarding - shows once on first login */}
      <WelcomeOnboarding />

      {/* Skip Link for keyboard accessibility */}
      <SkipLink />

      <div className="flex min-h-screen w-full bg-gradient-to-b from-[#f7f9ff] to-[#edf1f9]">
        <CollapsibleSidebar />
        <main className="flex-1 flex flex-col" role="main">
          {/* Add pb-20 for mobile tab bar space, remove on lg screens */}
          <div
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 sm:py-8 pb-24 lg:pb-8 focus:outline-none"
          >
            {/* Breadcrumb navigation - desktop version */}
            <nav className="hidden sm:block" aria-label="麵包屑導航">
              <Breadcrumb />
            </nav>
            {/* Breadcrumb navigation - mobile version */}
            <nav className="sm:hidden" aria-label="麵包屑導航">
              <BreadcrumbMobile />
            </nav>
            {children}
          </div>
        </main>
        {/* Mobile bottom tab navigation */}
        <MobileTabBar />
      </div>
    </AuthGuard>
  )
}
