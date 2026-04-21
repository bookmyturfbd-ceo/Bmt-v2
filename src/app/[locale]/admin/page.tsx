'use client';
import { useState } from 'react';
import AdminSidebar, { type AdminPage } from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStatsGrid from '@/components/admin/AdminStatsGrid';
import PlatformSettingsPanel from '@/components/admin/PlatformSettingsPanel';
import ManageOwnersTurfsPanel from '@/components/admin/ManageOwnersTurfsPanel';
import PayoutsLedgerPanel from '@/components/admin/PayoutsLedgerPanel';
import WalletRechargePanel from '@/components/admin/WalletRechargePanel';
import PlayersPanel from '@/components/admin/PlayersPanel';
import FrontendPanel from '@/components/admin/FrontendPanel';
import CompetitiveTeamsPanel from '@/components/admin/CompetitiveTeamsPanel';
import ChallengeMarketPanel from '@/components/admin/ChallengeMarketPanel';
import ShopPanel from '@/components/admin/ShopPanel';
import ShopOrdersPanel from '@/components/admin/ShopOrdersPanel';
import ShopIncomePanel from '@/components/admin/ShopIncomePanel';

const PAGE_TITLES: Record<AdminPage, string> = {
  overview:         'Dashboard Overview',
  platformSettings: 'Platform Settings',
  manageTurfs:      'Owners & Turfs',
  managePros:       'Manage Pros',
  payouts:          'Payouts & Ledger',
  walletRecharge:   'Wallet Recharge',
  players:          'Players',
  frontend:         'Frontend',
  competitiveTeams: 'Competitive Teams',
  challengeMarket:  'Challenge Market',
  shop:             'Shop Front',
  shopOrders:       'Shop Orders',
  shopIncome:       'Shop Income',
};

export default function AdminPage() {
  const [activePage, setActivePage] = useState<AdminPage>('overview');

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader breadcrumb={PAGE_TITLES[activePage]} />

        <main className="flex-1 p-5 md:p-10 flex flex-col gap-7 md:gap-10 overflow-y-auto">

          {activePage === 'overview' && (
            <section>
              <h2 className="text-[11px] md:text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-5">Platform Overview</h2>
              <AdminStatsGrid />
            </section>
          )}

          {activePage === 'platformSettings' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Platform Settings</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage global data that populates the platform — divisions, cities, sports, and amenities.</p>
              </div>
              <PlatformSettingsPanel />
            </section>
          )}

          {activePage === 'manageTurfs' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Owners & Turfs</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Review turf submissions, set revenue models, manage owner onboarding, and reset passwords.</p>
              </div>
              <ManageOwnersTurfsPanel />
            </section>
          )}

          {activePage === 'players' && (
            <section><PlayersPanel /></section>
          )}

          {activePage === 'payouts' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Payouts & Ledger</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Track turf earnings, BMT commissions, and disburse payments to turf owners.</p>
              </div>
              <PayoutsLedgerPanel />
            </section>
          )}

          {activePage === 'walletRecharge' && (
            <section><WalletRechargePanel /></section>
          )}

          {activePage === 'managePros' && (
            <section className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-4xl mb-3">🏆</p>
                <h3 className="text-lg font-black">Manage Pros</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Coming soon — coach and pro management.</p>
              </div>
            </section>
          )}

          {activePage === 'frontend' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Frontend Carousel</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage the home page hero banner — upload slides, set CTAs, control auto-slide speed.</p>
              </div>
              <FrontendPanel />
            </section>
          )}

          {activePage === 'competitiveTeams' && (
            <section className="h-full">
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Competitive Ecosystem</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">View the master database of all active teams battling in the platform ecosystem.</p>
              </div>
              <CompetitiveTeamsPanel />
            </section>
          )}

          {activePage === 'challengeMarket' && (
            <section className="h-full">
              <ChallengeMarketPanel />
            </section>
          )}

          {activePage === 'shop' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Shop Front</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage the shop carousel, product categories, and product listings.</p>
              </div>
              <ShopPanel />
            </section>
          )}

          {activePage === 'shopOrders' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Shop Orders</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage incoming player orders, deliveries, and payment verifications.</p>
              </div>
              <ShopOrdersPanel />
            </section>
          )}

          {activePage === 'shopIncome' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Shop Income</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Track revenue, product costs, marketing spend, and profit by product subcategory.</p>
              </div>
              <ShopIncomePanel />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
