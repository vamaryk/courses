import { ReactNode } from 'react';
import Header from "@/widgets/navigation/Header/Header"
import MenuSidebar from "@/widgets/navigation/MenuSidebar/MenuSidebar"
import Footer from "@/widgets/Footer"

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
                <main className="flex-1 mt-[4em] lg:ml-[100px] md:ml-[100px] sm:ml-0">
                    {children}
                </main>
            </div>
            <Footer />
        </div>
    )
}