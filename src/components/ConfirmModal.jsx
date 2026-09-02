import React from "react";
import { 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaInfoCircle, 
  FaTimesCircle 
} from "react-icons/fa";

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "OK", 
  cancelText = "Cancel", 
  type, 
  isAlert = false 
}) {
  if (!isOpen) return null;

  // Resolve type automatically if not explicitly given or for alerts
  const lowerTitle = (title || "").toLowerCase();
  let resolvedType = type;
  if (!resolvedType) {
    if (lowerTitle.includes("success")) resolvedType = "success";
    else if (lowerTitle.includes("error") || lowerTitle.includes("delete") || lowerTitle.includes("remove")) resolvedType = "danger";
    else if (lowerTitle.includes("warning") || lowerTitle.includes("validation") || lowerTitle.includes("alert")) resolvedType = "warning";
    else resolvedType = "info";
  } else if (isAlert && type === "danger" && lowerTitle.includes("success")) {
    resolvedType = "success";
  } else if (lowerTitle.includes("success")) {
    resolvedType = "success";
  }

  // Get style config based on resolvedType
  const getModalStyle = () => {
    switch (resolvedType) {
      case "success":
        return {
          icon: <FaCheckCircle />,
          iconBg: "rgba(16, 185, 129, 0.15)",
          iconColor: "#10b981",
          btnBg: "#10b981",
          btnShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
        };
      case "warning":
        return {
          icon: <FaExclamationTriangle />,
          iconBg: "rgba(245, 158, 11, 0.15)",
          iconColor: "#f59e0b",
          btnBg: "#f59e0b",
          btnShadow: "0 4px 12px rgba(245, 158, 11, 0.3)"
        };
      case "danger":
      case "error":
        return {
          icon: <FaTimesCircle />,
          iconBg: "rgba(239, 68, 68, 0.15)",
          iconColor: "#ef4444",
          btnBg: "#ef4444",
          btnShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
        };
      case "info":
      default:
        return {
          icon: <FaInfoCircle />,
          iconBg: "rgba(99, 102, 241, 0.15)",
          iconColor: "var(--primary)",
          btnBg: "var(--primary)",
          btnShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
        };
    }
  };

  const styleConfig = getModalStyle();

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(10, 10, 12, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      animation: "fadeIn 0.2s ease-out"
    }}>
      <div style={{
        background: "rgba(23, 23, 28, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "24px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        animation: "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        color: "var(--text-primary)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{
            background: styleConfig.iconBg,
            color: styleConfig.iconColor,
            padding: "10px",
            borderRadius: "10px",
            display: "flex",
            fontSize: "20px"
          }}>
            {styleConfig.icon}
          </div>
          <h4 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>{title}</h4>
        </div>

        {/* Message */}
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 24px" }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                border: "1px solid var(--border-color)",
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.05)"}
              onMouseOut={(e) => e.target.style.background = "transparent"}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              border: "none",
              background: styleConfig.btnBg,
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: styleConfig.btnShadow,
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.target.style.opacity = "0.9"}
            onMouseOut={(e) => e.target.style.opacity = "1"}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}

export default ConfirmModal;
