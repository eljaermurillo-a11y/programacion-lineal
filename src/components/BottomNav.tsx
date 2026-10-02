import React from 'react';

export type TabType = 'editor' | 'graph' | 'simplex' | 'history';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    {
      id: 'editor' as TabType,
      label: 'Editor',
      icon: 'tune',
      badge: null
    },
    {
      id: 'graph' as TabType,
      label: 'Gráfica',
      icon: 'show_chart',
      badge: '2D'
    },
    {
      id: 'simplex' as TabType,
      label: 'Simplex',
      icon: 'table_chart',
      badge: null
    },
    {
      id: 'history' as TabType,
      label: 'Historial',
      icon: 'inventory_2',
      badge: null
    }
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 w-full z-50 pb-safe bg-[#0a122a]/92 backdrop-blur-xl border-t border-[#212942]/70 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    >
      <div className="flex justify-around items-center h-16 px-3 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center w-20 h-12 transition-all relative rounded-xl ${
                isActive
                  ? 'text-[#adc6ff] bg-[#212942]/90 shadow-inner'
                  : 'text-[#c2c6d6] hover:text-[#dbe1ff] hover:bg-[#171e37]/40'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px] transition-transform duration-200">
                  {tab.icon}
                </span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-mono px-1 py-0.2 rounded bg-[#4edea3] text-[#003824] font-bold">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-wide mt-0.5 truncate max-w-full">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
