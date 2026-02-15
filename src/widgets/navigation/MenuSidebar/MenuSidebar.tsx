import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { MenuItems, MenuItem } from '@/widgets/navigation/model/menuItem';

const MenuSidebar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const renderMenuItem = (item: MenuItem, isMobile = false) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        return (
            <Link
                key={item.name}
                to={item.path}
                onClick={isMobile ? () => setIsMobileMenuOpen(false) : undefined}
                className={cn(
                    "flex items-center gap-3 px-4 py-2 text-white transition-all duration-300",
                    isMobile ? "rounded-xl hover:bg-white/10" : "rounded-l-[25px] hover:text-black group/item relative",
                    isActive && (isMobile ? "bg-white/10" : "bg-background text-black")
                )}
            >
                <Icon className={cn(
                    "w-5 h-5 flex-shrink-0",
                    !isMobile && "transition-transform duration-300 group-hover/item:scale-110 group-hover/item:rotate-3"
                )} />

                <span className={cn(
                    "text-sm font-medium",
                    isMobile ? "" : "whitespace-nowrap transition-transform duration-300 opacity-0 group-hover:opacity-100 group-hover/item:translate-x-2"
                )}>
                    {item.name}
                </span>

                {!isMobile && isActive && (
                    <div className={cn("absolute inset-0 bg-background -z-10 rounded-l-[25px]")}>
                        <div className="before:absolute before:bottom-full before:right-0 before:h-[150%] before:w-[24px] before:rounded-br-[25px] before:shadow-[0_20px_0_0_#F5F5F5]" />
                        <div className="after:absolute after:top-full after:right-0 after:h-[150%] after:w-[24px] after:rounded-tr-[25px] after:shadow-[0_-20px_0_0_#F5F5F5]" />
                    </div>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Menu */}
            <div className="lg:hidden z-101">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="fixed top-4 left-4 z-50 ml-1 p-2 rounded-[10px] bg-purple text-white"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                </button>

                <div className={cn(
                    "fixed inset-0 bg-purple z-40 transform transition-transform duration-300",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="flex flex-col pt-20 px-4">
                        {MenuItems.map(item => renderMenuItem(item, true))}
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block fixed left-0 top-[4em] bg-purple rounded-tr-[25px] h-[calc(100vh-4em)] overflow-hidden transition-all duration-300 w-[100px] hover:w-[200px] group z-[100]">
                <div className="flex flex-col gap-2 p-[24px] pr-0 pt-[60px]">
                    {MenuItems.map(item => renderMenuItem(item))}
                </div>
            </div>
        </>
    );
};

export default MenuSidebar;