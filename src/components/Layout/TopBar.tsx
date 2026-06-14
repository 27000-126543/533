import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Home,
  Cpu,
  AlertTriangle,
  FileBarChart,
  Lightbulb,
  Settings,
} from 'lucide-react';
import useAppStore from '@/store/appStore';
import { roleLabel } from '@/utils/format';

const breadcrumbMap: Record<string, { label: string; icon: typeof Home }> = {
  '/': { label: '综合看板', icon: Home },
  '/simulation': { label: '模拟中心', icon: Cpu },
  '/alerts': { label: '预警审批', icon: AlertTriangle },
  '/reports': { label: '报告导出', icon: FileBarChart },
  '/recommendation': { label: '智能推荐', icon: Lightbulb },
  '/admin': { label: '系统管理', icon: Settings },
};

export default function TopBar() {
  const location = useLocation();
  const { currentUser, notifications, setCurrentUser, clearNotifications } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const currentPath = location.pathname;
  const breadcrumb = breadcrumbMap[currentPath] || { label: '页面', icon: Home };
  const BreadcrumbIcon = breadcrumb.icon;
  const unreadCount = notifications.length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setShowUserMenu(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 flex items-center gap-1">
              <Home className="w-4 h-4" />
              首页
            </span>
            <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <BreadcrumbIcon className="w-4 h-4" />
              {breadcrumb.label}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模拟任务、报告..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-72 h-10 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-800">通知中心</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      全部清除
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">
                      暂无新通知
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                              n.type === 'error'
                                ? 'bg-red-500'
                                : n.type === 'warning'
                                ? 'bg-yellow-500'
                                : n.type === 'success'
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.timestamp).toLocaleString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 h-10 pl-2 pr-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-medium">
                {currentUser?.username?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">
                  {currentUser?.username || '用户'}
                </p>
                <p className="text-xs text-gray-500">
                  {currentUser?.role ? roleLabel(currentUser.role) : ''}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">
                    {currentUser?.username}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {currentUser?.role ? roleLabel(currentUser.role) : ''}
                  </p>
                </div>
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    个人信息
                  </button>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
