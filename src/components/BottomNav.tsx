import React from 'react';
import { Home, Bomb, Castle, History, Award } from 'lucide-react';
import { sound } from '../utils/audio';

export type TabType = 'home' | 'mines' | 'towers' | 'history' | 'wager';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unclaimedRakebackUsd?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  unclaimedRakebackUsd = 0,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'mines' as TabType, label: 'Mines', icon: Bomb },
    { id: 'towers' as TabType, label: 'Towers', icon: Castle },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'wager' as TabType, label: 'Wager & VIP', icon: Award, badge: unclaimedRakebackUsd > 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a122a] border-t border-[#c0c0c0]/30 shadow-2xl py-2 px-2 sm:px-4 backdrop-blur-md">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1.5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => {
                onSelectTab(tab.id);
                sound.playClick();
              }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? 'text-[#00ff41] bg-[#00ff41]/10 border border-[#00ff41]/40 shadow-[0_0_15px_rgba(0,255,65,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-[#1a2b4b]/40 border border-transparent'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : 'group-hover:scale-105'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff41]"></span>
                  </span>
                )}
              </div>
              <span className={`text-[9px] mt-1 font-bold uppercase tracking-wider whitespace-nowrap ${isActive ? 'text-[#00ff41]' : 'text-[#c0c0c0]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
