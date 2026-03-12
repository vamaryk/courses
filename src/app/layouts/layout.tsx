import type { ReactNode } from 'react';
import Header from "@/widgets/navigation/Header/Header";
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar";
import Footer from "@/widgets/Footer";
import { SocketProvider } from "@/app/providers/SocketProvider";

interface LayoutProps {
    children: ReactNode;
    showSidebar?: boolean;
}

export default function AppLayout({ children, showSidebar = true }: LayoutProps) {
    return (
        <SocketProvider>
            <div className="min-h-screen flex flex-col">
                <Header />
                <div className="flex flex-1">
                    {showSidebar && <MenuSidebar />}
                    <main className="flex-1 mt-[4em] lg:ml-[100px] sm:ml-0">
                        {children}
                    </main>
                </div>
                <Footer />
            </div>
        </SocketProvider>
    )
} 