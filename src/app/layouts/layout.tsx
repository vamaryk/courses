import type { ReactNode } from 'react';
import Header from "@/widgets/navigation/Header/Header";
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar";
import Footer from "@/widgets/Footer";
import { SocketProvider } from "@/app/providers/SocketProvider";

interface LayoutProps {
    children: ReactNode;
    showSidebar?: boolean;
    showFooter?: boolean;
}

export default function AppLayout({ children, showSidebar = true, showFooter = true }: LayoutProps) {
    return (
        <SocketProvider>
            <div className="min-h-screen flex flex-col">
                <Header />
                <div className="flex flex-1">
                    {showSidebar && <MenuSidebar />}
                    <main className="flex-1 min-w-0 w-full mt-[calc(4em+env(safe-area-inset-top,0px))] ml-0 min-[1200px]:ml-[100px]">
                        {children}
                    </main>
                </div>
                {showFooter && <Footer />}
            </div>
        </SocketProvider>
    )
}