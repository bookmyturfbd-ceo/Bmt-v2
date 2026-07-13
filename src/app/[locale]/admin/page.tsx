'use client';
import { useState, useEffect } from 'react';
import AdminSidebar, { type AdminPage } from '@/components/admin/AdminSidebar';
import { getCookie } from '@/lib/cookies';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStatsGrid from '@/components/admin/AdminStatsGrid';
import PlatformSettingsPanel from '@/components/admin/PlatformSettingsPanel';
import ManageOwnersTurfsPanel from '@/components/admin/ManageOwnersTurfsPanel';
import ManageProsPanel from '@/components/admin/ManageProsPanel';
import PayoutsLedgerPanel from '@/components/admin/PayoutsLedgerPanel';
import WalletRechargePanel from '@/components/admin/WalletRechargePanel';
import PlayersPanel from '@/components/admin/PlayersPanel';
import FrontendPanel from '@/components/admin/FrontendPanel';
import SponsorsPanel from '@/components/admin/SponsorsPanel';
import CompetitiveTeamsPanel from '@/components/admin/CompetitiveTeamsPanel';
import ChallengeMarketPanel from '@/components/admin/ChallengeMarketPanel';
import ShopPanel from '@/components/admin/ShopPanel';
import ShopOrdersPanel from '@/components/admin/ShopOrdersPanel';
import ShopIncomePanel from '@/components/admin/ShopIncomePanel';
import OpenWbtPanel from '@/components/admin/OpenWbtPanel';
import TournamentListTab from '@/components/admin/tournaments/TournamentListTab';
import OrganizerListTab from '@/components/admin/tournaments/OrganizerListTab';
import OrganizerRechargePanel from '@/components/admin/OrganizerRechargePanel';
import OrganizerPayoutPanel from '@/components/admin/tournaments/OrganizerPayoutPanel';
import InterestedPanel from '@/components/admin/InterestedPanel';

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
  openWbt:          'Open WBT',
  shop:             'Shop Front',
  shopOrders:       'Shop Orders',
  shopIncome:       'Shop Income',
  tournaments:      'Tournament Engine',
  bmtTournaments:   'BMT Tournaments',
  organizers:       'Tournament Organizers',
  orgRecharge:      'Org Wallet Recharges',
  orgPayouts:       'Organizer Payouts',
  interested:       'Interested Parties',
};

export default function AdminPage() {
  const [activePage, setActivePage] = useState<AdminPage>('overview');
  const [frontendTab, setFrontendTab] = useState<'carousel' | 'sponsors'>('carousel');
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const r = getCookie('bmt_role');
    setRole(r);
    if (r === 'shop_manager') {
      setActivePage('shopOrders');
    }
  }, []);

  const isShopManager = role === 'shop_manager';
  const displayPage = isShopManager
    ? (activePage === 'interested' ? 'interested' : 'shopOrders')
    : activePage;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar activePage={displayPage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader breadcrumb={PAGE_TITLES[displayPage]} />

        <main className="flex-1 p-5 md:p-10 flex flex-col gap-7 md:gap-10 overflow-y-auto">

          {displayPage === 'overview' && (
            <section>
              <h2 className="text-[11px] md:text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-5">Platform Overview</h2>
              <AdminStatsGrid />
            </section>
          )}

          {displayPage === 'platformSettings' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Platform Settings</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage global data that populates the platform — divisions, cities, sports, and amenities.</p>
              </div>
              <PlatformSettingsPanel />
            </section>
          )}

          {displayPage === 'manageTurfs' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Owners & Turfs</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Review turf submissions, set revenue models, manage owner onboarding, and reset passwords.</p>
              </div>
              <ManageOwnersTurfsPanel />
            </section>
          )}

          {displayPage === 'players' && (
            <section><PlayersPanel /></section>
          )}

          {displayPage === 'payouts' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Payouts & Ledger</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Track turf earnings, BMT commissions, and disburse payments to turf owners.</p>
              </div>
              <PayoutsLedgerPanel />
            </section>
          )}

          {displayPage === 'walletRecharge' && (
            <section><WalletRechargePanel /></section>
          )}

          {displayPage === 'managePros' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Coaches & Pros</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Review coach profiles, generate invites for professionals, and manage their access.</p>
              </div>
              <ManageProsPanel />
            </section>
          )}

          {displayPage === 'frontend' && (
            <section className="flex flex-col h-full">
              <div className="mb-5 md:mb-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-2xl font-black">Frontend Customization</h2>
                  <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage the home page hero banner and sponsor logos.</p>
                </div>
                <div className="flex bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl p-1 shrink-0">
                  <button onClick={() => setFrontendTab('carousel')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${frontendTab === 'carousel' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-white'}`}>Hero Carousel</button>
                  <button onClick={() => setFrontendTab('sponsors')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${frontendTab === 'sponsors' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-white'}`}>Sponsors</button>
                </div>
              </div>
              <div className="flex-1">
                {frontendTab === 'carousel' ? <FrontendPanel /> : <SponsorsPanel />}
              </div>
            </section>
          )}

          {displayPage === 'competitiveTeams' && (
            <section className="h-full">
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Competitive Ecosystem</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">View the master database of all active teams battling in the platform ecosystem.</p>
              </div>
              <CompetitiveTeamsPanel />
            </section>
          )}

          {displayPage === 'challengeMarket' && (
            <section className="h-full">
              <ChallengeMarketPanel />
            </section>
          )}

          {displayPage === 'openWbt' && (
            <section>
              <OpenWbtPanel />
            </section>
          )}

          {displayPage === 'bmtTournaments' && (
            <section className="h-full">
              <TournamentListTab />
            </section>
          )}

          {displayPage === 'organizers' && (
            <section className="h-full">
              <OrganizerListTab />
            </section>
          )}

          {displayPage === 'orgRecharge' && (
            <section><OrganizerRechargePanel /></section>
          )}

          {displayPage === 'orgPayouts' && (
            <section className="h-full">
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Organizer Payouts</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Entry fees collected from tournament registrations, held by BMT. Clear with proof to release to organizer wallets.</p>
              </div>
              <OrganizerPayoutPanel />
            </section>
          )}

          {displayPage === 'shop' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Shop Front</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage the shop carousel, product categories, and product listings.</p>
              </div>
              <ShopPanel />
            </section>
          )}

          {displayPage === 'shopOrders' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Shop Orders</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Manage incoming player orders, deliveries, and payment verifications.</p>
              </div>
              <ShopOrdersPanel />
            </section>
          )}

          {displayPage === 'shopIncome' && (
            <section>
              <div className="mb-5 md:mb-7">
                <h2 className="text-lg md:text-2xl font-black">Shop Income</h2>
                <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">Track revenue, product costs, marketing spend, and profit by product subcategory.</p>
              </div>
              <ShopIncomePanel />
            </section>
          )}

          {displayPage === 'interested' && (
            <section className="h-full">
              <InterestedPanel />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
