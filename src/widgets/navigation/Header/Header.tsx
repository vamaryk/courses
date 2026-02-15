
import { Path } from '@/shared/routing/path';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { GraduationCap } from 'lucide-react';

export default function Header() {

    const [isActive, setActive] = useState(false);
    const [isNotificationActive, setNotificationActive] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const profileButtonRef = useRef<HTMLDivElement>(null);
    const notificationButtonRef = useRef<HTMLButtonElement>(null);


const toggleNotifications = () => {
  setNotificationActive((prev) => {
    if (!prev) setActive(false); 
    return !prev;
  });
};

const toggleProfileMenu = () => {
  setActive((prev) => {
    if (!prev) setNotificationActive(false);
    return !prev;
  });
};

// Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Закрываем уведомления
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setNotificationActive(false);
      }

      // Закрываем профильное меню
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

    return <nav className=" bg-header flex fixed top-0 left-0 w-full justify-between items-center h-[4em] px-10 z-100 mb-16">
        <div className="pl-8 lg:pl-0">
            <Link to={Path.Home}>
                <GraduationCap size={24} className="text-purple" />
            </Link>
        </div>
        <div className='flex flex-row items-center gap-2'>
            <button ref={notificationButtonRef} onClick={toggleNotifications}>
                <svg width="15"
                    height="17"
                    viewBox="0 0 15 17"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className='max-w-6 max-h-6 cursor-pointer mr-2'>
                    <path d="M14.778 11.8665L13.141 8.84434V5.69768C13.141 2.55597 10.585 0 7.44333 0C4.30162 0 1.74565 2.55597 1.74565 5.69768V8.84434L0.108618 11.8665C0.0343797 12.0035 -0.00298452 12.1575 0.000186238 12.3133C0.00335699 12.4691 0.0469539 12.6214 0.126705 12.7553C0.206456 12.8892 0.319626 13.0001 0.455125 13.0771C0.590625 13.1542 0.743805 13.1946 0.899658 13.1946H4.1584C4.14931 13.2943 4.14471 13.3944 4.14464 13.4945C4.14464 14.3694 4.49217 15.2084 5.11079 15.827C5.72941 16.4456 6.56844 16.7932 7.4433 16.7932C8.31816 16.7932 9.15718 16.4456 9.7758 15.827C10.3944 15.2084 10.742 14.3694 10.742 13.4945C10.742 13.3933 10.7371 13.2934 10.7282 13.1946H13.9869C14.1428 13.1946 14.2959 13.1541 14.4314 13.0771C14.5669 13.0001 14.68 12.8892 14.7598 12.7553C14.8395 12.6214 14.8831 12.4691 14.8863 12.3133C14.8894 12.1575 14.8522 12.0035 14.778 11.8665ZM9.54248 13.4945C9.54272 13.783 9.48349 14.0684 9.3685 14.333C9.25351 14.5975 9.08522 14.8356 8.87414 15.0322C8.66306 15.2288 8.41372 15.3798 8.14168 15.4758C7.86964 15.5718 7.58073 15.6106 7.293 15.59C7.00527 15.5693 6.72488 15.4896 6.46934 15.3557C6.2138 15.2219 5.98859 15.0368 5.80777 14.812C5.62694 14.5873 5.49439 14.3276 5.41838 14.0493C5.34236 13.7711 5.32452 13.4801 5.36597 13.1946H9.52066C9.53508 13.2939 9.54237 13.3942 9.54248 13.4945ZM1.40312 11.9951L2.94516 9.14834V5.69768C2.94516 4.50469 3.41908 3.36057 4.26265 2.517C5.10622 1.67342 6.25035 1.19951 7.44333 1.19951C8.63632 1.19951 9.78045 1.67342 10.624 2.517C11.4676 3.36057 11.9415 4.50469 11.9415 5.69768V9.14834L13.4835 11.9951H1.40312Z" fill="#525252" />
                </svg>
                 <div ref={notificationRef} className={`flex flex-col absolute bg-background items-center justify-center gap-y-1 z-10 w-70 h-75 right-3 top-15 shadow-lg rounded-2xl overflow-hidden transition-all duration-150 ${isNotificationActive
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}></div>
            </button>
            <div>
                <a href="#">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                </a>
            </div>

            <div ref={profileButtonRef} onClick={toggleProfileMenu}>
                <svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg" className={`max-w-6 max-h-6 cursor-pointer ${isActive ? 'rotate-180 transition duration-120 ' : 'transition duration-85'}`}>
                    <path d="M13 1L7 7L1 1" stroke="#525252" strokeWidth="1.5" />
                </svg>
                <div ref={profileMenuRef} className={`flex flex-col absolute items-center justify-center gap-y-1 z-10 w-50 p-4 right-3 top-15 shadow-lg rounded-2xl overflow-hidden transition-all duration-150 ${isActive
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}>
                    <Link to={Path.Auth} className="bg-light-grey flex items-center justify-center shadow-sm cursor-pointer font-Montserrat hover:bg-blue w-40 h-8 rounded-2xl transition duration-150 ease-in-out">Войти</Link>
                    {/* <Link to={Path.Auth} className=" bg-light-grey flex items-center justify-center shadow-sm cursor-pointer font-Montserrat hover:bg-blue w-40 h-8 rounded-2xl transition duration-150 ease-in-out">Создать аккаунт</Link> */}
                </div>


            </div>
        </div>
    </nav>
}