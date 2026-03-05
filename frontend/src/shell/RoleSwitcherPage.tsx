import React from "react";
import type { PageId } from "../layouts/CreatorShellLayout";
// import { useTheme } from "../contexts/ThemeContext";

type RoleSwitcherPageProps = {
  onChangePage: (page: PageId) => void;
};

type Role = {
  id: "buyer" | "seller" | "creator" | "provider";
  label: string;
  icon: string;
  desc: string;
  color: string;
};

export const RoleSwitcherPage: React.FC<RoleSwitcherPageProps> = ({
  onChangePage
}) => {
  // const { theme } = useTheme(); // Unused

  const roles: Role[] = [
    {
      id: "buyer",
      label: "Buyer",
      icon: "🛒",
      desc: "Shop curated dealz, watch live sessions, and enjoy the MyLive experience.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      id: "seller",
      label: "Seller",
      icon: "🏪",
      desc: "Launch your products, manage your storefront, and grow your brand.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      id: "creator",
      label: "Creator",
      icon: "🎥",
      desc: "Supplier with brands, showcase products, and monetize your influence.",
      color: "from-[#f77f00] to-orange-600"
    },
    {
      id: "provider",
      label: "Provider",
      icon: "🤝",
      desc: "Offer services, support creators, and expand your professional network.",
      color: "from-purple-500 to-violet-600"
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Immersive Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-orange-500 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 py-12 flex flex-col items-center">


        {/* Logo */}
        {/* Professional "Windowed" Responsive Logo Section */}
        {/* Professional Layered Logo for Pixel-Perfect Brand Fidelity */}
        <div className="mb-10 relative h-16 sm:h-20 md:h-24 w-full max-w-[200px] sm:max-w-[300px] md:max-w-[400px] flex items-center justify-center">
          {/* Light Mode Logo (Black) */}
          <img
            src="/MyliveDealz PNG Logo 1 Black.png"
            alt="MyLiveDealz"
            className="h-full w-full object-contain dark:hidden"
          />
          {/* Dark Mode Logo (White) */}
          <img
            src="/MyliveDealz PNG Logo 1 White.png"
            alt="MyLiveDealz"
            className="h-full w-full object-contain hidden dark:block"
          />
        </div>

        {/* Header Text */}
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-black mb-4 tracking-tight text-slate-900 dark:text-white">
            Choose how you want to use MyLiveDealz today
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            You can switch roles anytime. This shell will later route you to the dedicated Buyer, Seller or Creator experiences.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {roles.filter(r => r.id !== 'creator').map((role) => (
            <RoleCard key={role.id} role={role} onChangePage={onChangePage} />
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
          MyLiveDealz Multi-Role Ecosystem
        </div>
      </div>
    </div>
  );
};

type RoleCardProps = {
  role: Role;
  onChangePage: (page: PageId) => void;
};

const RoleCard: React.FC<RoleCardProps> = ({ role, onChangePage }) => {
  const targetPage: PageId = "home";

  return (
    <button
      className="group relative flex flex-col items-center text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-[#f77f00] dark:hover:border-[#f77f00] transition-all duration-300 transform hover:-translate-y-2"
      onClick={() => onChangePage(targetPage)}
    >
      {/* Decorative Gradient Icon Background */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-3xl mb-6 shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300`}>
        {role.icon}
      </div>

      <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white group-hover:text-[#f77f00] transition-colors">
        {role.label}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
        {role.desc}
      </p>

      {/* Hover Selection Indicator */}
      <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-[#f77f00] text-xs font-black uppercase tracking-widest">
        <span>Enter {role.label}</span>
        <span>→</span>
      </div>
    </button>
  );
};
