import { ReactNode } from 'react';
import Header from "@/widgets/navigation/Header/Header"
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar"

interface LayoutProps {
    children: ReactNode;
    showSidebar?: boolean;
}

export default function AppLayout({ children, showSidebar = true }: LayoutProps) {
    return (
        <div>
            <Header />
            <div className="flex">
                {showSidebar && <MenuSidebar />}
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    )
}