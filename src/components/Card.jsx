import { FaArrowUp, FaArrowDown } from "react-icons/fa";

function Card({ title, value, icon, trend, trendValue, accentColor }) {
  return (
    <div 
      className="stat-card animate-slide-up" 
      style={{ "--card-accent": accentColor }}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-icon">{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      {trend && (
        <div className={`stat-card-trend ${trend}`}>
          {trend === "up" ? <FaArrowUp /> : <FaArrowDown />}
          <span>{trendValue}</span>
          <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>than last month</span>
        </div>
      )}
    </div>
  );
}

export default Card;
