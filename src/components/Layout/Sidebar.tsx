import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  FileBarChart,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sprout,
} from 'lucide-react';
import useAppStore from '@/store/appStore';

const navItems = [
  { path: '/', label: '综合看板', icon: LayoutDashboard },
  { path: '/simulation', label: '模拟中心', icon: Cpu },
  { path: '/alerts', label: '预警审批', icon: AlertTriangle },
  { path: '/reports', label: '报告导出', icon: FileBarChart },
  { path: '/recommendation', label: '智能推荐', icon: Lightbulb },
  { path: '/admin', label: '系统管理', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activeNav, setActiveNav } = useAppStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-green-900 text-white transition-all duration-300 z-40 shadow-xl ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        <div
          className={`flex items-center h-16 px-4 border-b border-emerald-700/50 ${
            sidebarCollapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <Sprout className="w-8 h-8 text-emerald-300 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="ml-3 text-lg font-bold whitespace-nowrap">
              智慧农业模拟平台
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setActiveNav(item.path)}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-600/40 text-white shadow-inner border-l-4 border-emerald-400'
                    : 'text-emerald-100/80 hover:bg-emerald-700/30 hover:text-white border-l-4 border-transparent'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${
                    isActive ? 'text-emerald-300' : 'group-hover:text-emerald-300'
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="ml-3 text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={toggleSidebar}
          className="h-12 flex items-center justify-center border-t border-emerald-700/50 text-emerald-200/70 hover:text-white hover:bg-emerald-700/30 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
