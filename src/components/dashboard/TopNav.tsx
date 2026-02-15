interface TopNavProps {
  userName?: string;
}

const TopNav = ({ userName = "Сергей Сергеев" }: TopNavProps) => {

  return (
    <div className="flex items-center justify-between mb-8">
      {/* Welcome Message */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">👋</span>
        <h1 className="text-2xl font-semibold text-foreground font-Xolonium">
          С возвращением, {userName}!
        </h1>
      </div>
    </div>
  );
};

export default TopNav;
