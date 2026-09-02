import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaStore, 
  FaPlus, 
  FaTrash, 
  FaEdit, 
  FaStar, 
  FaRegStar, 
  FaBoxes, 
  FaMoneyBillWave, 
  FaShoppingCart, 
  FaSearch, 
  FaCheckCircle, 
  FaTimes, 
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaTag
} from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";
import { API_URL } from "../config";

const PLATFORM_OPTIONS = [
  { value: "Meesho", label: "Meesho", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.3)" },
  { value: "Flipkart", label: "Flipkart", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)" },
  { value: "Amazon", label: "Amazon", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" },
  { value: "Glowroad", label: "Glowroad", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
  { value: "Shopsy", label: "Shopsy", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.3)" },
  { value: "Other", label: "Other Channel", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.3)" }
];

export const getPlatformStyle = (platform) => {
  const match = PLATFORM_OPTIONS.find(p => p.value.toLowerCase() === (platform || "").toLowerCase());
  if (match) return match;
  return { value: platform || "Other", label: platform || "Other", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.3)" };
};

function Shops() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("All");

  // Add Shop Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newPlatform, setNewPlatform] = useState("Meesho");
  const [newStatus, setNewStatus] = useState("Active");
  const [newDescription, setNewDescription] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);

  // Edit Shop Modal State
  const [editingShop, setEditingShop] = useState(null);
  const [editShopName, setEditShopName] = useState("");
  const [editPlatform, setEditPlatform] = useState("Meesho");
  const [editStatus, setEditStatus] = useState("Active");
  const [editDescription, setEditDescription] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);

  // Confirmation & Alert modals
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteShopName, setDeleteShopName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Notice");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, title = "Notice") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const [shopsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/api/shops`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!shopsRes.ok) throw new Error("Failed to fetch shops");
      const shopsData = await shopsRes.json();
      setShops(shopsData);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats per shop
  const shopStats = useMemo(() => {
    const statsMap = {};
    shops.forEach(s => {
      statsMap[s.shopName] = {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        returnOrders: 0,
        totalSales: 0,
        netProfit: 0
      };
    });

    orders.forEach(o => {
      const sName = o.shopName || "HKC Collection";
      if (!statsMap[sName]) {
        statsMap[sName] = {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          returnOrders: 0,
          totalSales: 0,
          netProfit: 0
        };
      }

      statsMap[sName].totalOrders += 1;
      const status = o.paymentStatus || "Pending";
      if (status === "Complete") {
        statsMap[sName].completedOrders += 1;
        const sell = (o.sellingPrice || o.productId?.sellingPrice || 0) * (o.quantity || 1);
        statsMap[sName].totalSales += sell;
      } else if (status === "Pending") {
        statsMap[sName].pendingOrders += 1;
      } else if (status === "Return" || status === "Wrong Return" || status === "RTO Returned" || status === "Cancel") {
        statsMap[sName].returnOrders += 1;
      }
    });

    return statsMap;
  }, [shops, orders]);

  // Handle Add Shop
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!newShopName.trim()) {
      showAlert("Please enter a shop name", "Validation Error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/shops/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          shopName: newShopName.trim(),
          platform: newPlatform,
          status: newStatus,
          description: newDescription.trim(),
          isDefault: newIsDefault
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add shop");
      }

      setIsAddModalOpen(false);
      setNewShopName("");
      setNewDescription("");
      setNewPlatform("Meesho");
      setNewStatus("Active");
      setNewIsDefault(false);
      fetchData();
      showAlert("Shop account created successfully!", "Success");
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const startEdit = (shop) => {
    setEditingShop(shop);
    setEditShopName(shop.shopName);
    setEditPlatform(shop.platform || "Meesho");
    setEditStatus(shop.status || "Active");
    setEditDescription(shop.description || "");
    setEditIsDefault(Boolean(shop.isDefault));
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !editingShop) return;

    if (!editShopName.trim()) {
      showAlert("Shop Name cannot be blank", "Validation Error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/shops/${editingShop._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          shopName: editShopName.trim(),
          platform: editPlatform,
          status: editStatus,
          description: editDescription.trim(),
          isDefault: editIsDefault
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update shop");
      }

      setEditingShop(null);
      fetchData();
      showAlert("Shop details updated successfully!", "Success");
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setSubmitting(false);
    }
  };

  // Set As Default Shop
  const handleSetDefault = async (shopId) => {
    try {
      const res = await fetch(`${API_URL}/api/shops/${shopId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ isDefault: true })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to set default shop");
      }
      fetchData();
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  // Trigger Delete
  const confirmDelete = (shop) => {
    if (shops.length <= 1) {
      showAlert("You must have at least one active shop account. You cannot delete the last remaining shop.", "Action Denied");
      return;
    }
    setDeleteId(shop._id);
    setDeleteShopName(shop.shopName);
    setDeleteConfirmOpen(true);
  };

  // Execute Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_URL}/api/shops/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete shop");
      }
      setDeleteConfirmOpen(false);
      setDeleteId(null);
      fetchData();
      showAlert("Shop account deleted successfully.", "Deleted");
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter(s => {
      const matchesSearch = s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPlatform = filterPlatform === "All" || s.platform.toLowerCase() === filterPlatform.toLowerCase();
      return matchesSearch && matchesPlatform;
    });
  }, [shops, searchQuery, filterPlatform]);

  return (
    <div className="shops-container" style={{ padding: "8px 0" }}>
      {/* Header & Title */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h2 style={{
            fontSize: "24px",
            fontWeight: "800",
            margin: "0 0 4px",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <FaStore style={{ color: "var(--primary)" }} /> My Shops & Accounts
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            Manage all your Meesho, Flipkart, Amazon, and other seller accounts in one unified dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, var(--primary), #818cf8)",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
            transition: "all var(--transition-fast)"
          }}
          className="add-btn-hover"
        >
          <FaPlus /> Add New Shop
        </button>
      </div>

      {/* Top Metric Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            background: "rgba(99, 102, 241, 0.15)",
            color: "var(--primary)",
            padding: "14px",
            borderRadius: "12px",
            fontSize: "22px"
          }}>
            <FaStore />
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Total Shops</div>
            <div style={{ color: "var(--text-primary)", fontSize: "24px", fontWeight: "800" }}>{shops.length}</div>
          </div>
        </div>

        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            background: "rgba(16, 185, 129, 0.15)",
            color: "var(--success)",
            padding: "14px",
            borderRadius: "12px",
            fontSize: "22px"
          }}>
            <FaCheckCircle />
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Active Accounts</div>
            <div style={{ color: "var(--text-primary)", fontSize: "24px", fontWeight: "800" }}>
              {shops.filter(s => s.status === "Active").length}
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            background: "rgba(244, 63, 94, 0.15)",
            color: "#f43f5e",
            padding: "14px",
            borderRadius: "12px",
            fontSize: "22px"
          }}>
            <FaShoppingCart />
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Total Orders Logged</div>
            <div style={{ color: "var(--text-primary)", fontSize: "24px", fontWeight: "800" }}>{orders.length}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "14px 18px",
        marginBottom: "20px",
        display: "flex",
        flexWrap: "wrap",
        gap: "14px",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "240px" }}>
          <FaSearch style={{ color: "var(--text-muted)", fontSize: "14px" }} />
          <input
            type="text"
            placeholder="Search by shop name or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "14px",
              width: "100%"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Platform Filter Buttons */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterPlatform("All")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid var(--border-color)",
              background: filterPlatform === "All" ? "var(--primary)" : "transparent",
              color: filterPlatform === "All" ? "#fff" : "var(--text-secondary)",
              cursor: "pointer"
            }}
          >
            All Platforms
          </button>
          {PLATFORM_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => setFilterPlatform(p.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                border: filterPlatform === p.value ? `1px solid ${p.color}` : "1px solid var(--border-color)",
                background: filterPlatform === p.value ? p.bg : "transparent",
                color: filterPlatform === p.value ? p.color : "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Shop Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          Loading your shop accounts...
        </div>
      ) : filteredShops.length === 0 ? (
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--text-muted)"
        }}>
          <FaStore style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.4 }} />
          <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>No Shops Found</h3>
          <p style={{ margin: "0 0 20px", fontSize: "14px" }}>
            {searchQuery || filterPlatform !== "All"
              ? "No shop accounts matched your search/filter criteria."
              : "You don't have any shop accounts registered yet."}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: "10px 20px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <FaPlus style={{ marginRight: "6px" }} /> Add Your First Shop
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px"
        }}>
          {filteredShops.map((shop) => {
            const pStyle = getPlatformStyle(shop.platform);
            const stats = shopStats[shop.shopName] || { totalOrders: 0, completedOrders: 0, pendingOrders: 0, returnOrders: 0, totalSales: 0 };
            const isDefaultShop = Boolean(shop.isDefault);

            return (
              <div
                key={shop._id}
                style={{
                  background: "var(--card-bg)",
                  border: isDefaultShop ? "2px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-color)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: isDefaultShop ? "0 8px 24px rgba(99, 102, 241, 0.12)" : "none",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                className="shop-card-hover"
              >
                {/* Top Row: Platform Badge, Default Badge, Status */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        background: pStyle.bg,
                        color: pStyle.color,
                        border: `1px solid ${pStyle.border}`,
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}>
                        <FaTag style={{ fontSize: "10px" }} /> {shop.platform || "Meesho"}
                      </span>

                      {isDefaultShop && (
                        <span style={{
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <FaStar style={{ fontSize: "10px" }} /> PRIMARY DEFAULT
                        </span>
                      )}
                    </div>

                    <span style={{
                      background: shop.status === "Active" ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.15)",
                      color: shop.status === "Active" ? "var(--success)" : "var(--text-muted)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700"
                    }}>
                      {shop.status || "Active"}
                    </span>
                  </div>

                  {/* Shop Name & Description */}
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "800",
                    margin: "0 0 6px",
                    color: "var(--text-primary)"
                  }}>
                    {shop.shopName}
                  </h3>

                  {shop.description ? (
                    <p style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      margin: "0 0 16px",
                      lineHeight: "1.4"
                    }}>
                      {shop.description}
                    </p>
                  ) : (
                    <div style={{ height: "12px" }} />
                  )}

                  {/* Stats Box */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.15)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                    marginBottom: "16px",
                    textAlign: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>Orders</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", marginTop: "2px" }}>
                        {stats.totalOrders}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>Complete</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--success)", marginTop: "2px" }}>
                        {stats.completedOrders}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>Returns</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--danger)", marginTop: "2px" }}>
                        {stats.returnOrders}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap"
                }}>
                  {/* View Orders Button */}
                  <button
                    type="button"
                    onClick={() => navigate(`/accounts?shop=${encodeURIComponent(shop.shopName)}`)}
                    style={{
                      background: "rgba(99, 102, 241, 0.1)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      color: "var(--primary)",
                      padding: "7px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all var(--transition-fast)"
                    }}
                    className="view-orders-btn"
                  >
                    <FaExternalLinkAlt style={{ fontSize: "10px" }} /> View Orders
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {!isDefaultShop && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(shop._id)}
                        title="Set as Default Shop"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-muted)",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        <FaRegStar style={{ marginRight: "4px" }} /> Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startEdit(shop)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                      title="Edit Shop Details"
                    >
                      <FaEdit />
                    </button>

                    <button
                      type="button"
                      onClick={() => confirmDelete(shop)}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                      title="Delete Shop"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add New Shop */}
      {isAddModalOpen && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(10, 10, 12, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "rgba(23, 23, 28, 0.98)",
            border: "1px solid var(--border-color)",
            borderRadius: "20px",
            padding: "24px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
            color: "var(--text-primary)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaStore style={{ color: "var(--primary)" }} /> Add New Shop Account
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Shop Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Radhe Enterprise, HKC Collection..."
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Platform / Channel
                </label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                >
                  {PLATFORM_OPTIONS.map(p => (
                    <option key={p.value} value={p.value} style={{ background: "var(--bg-secondary)" }}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Account Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="Active" style={{ background: "var(--bg-secondary)" }}>Active</option>
                  <option value="Inactive" style={{ background: "var(--bg-secondary)" }}>Inactive</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Primary Flipkart store for women wear"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="newIsDefaultCheck"
                  checked={newIsDefault}
                  onChange={(e) => setNewIsDefault(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="newIsDefaultCheck" style={{ fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "var(--text-secondary)" }}>
                  Set as Primary Default Shop for new orders
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    border: "none",
                    background: "var(--primary)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "700",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
                  }}
                >
                  {submitting ? "Saving..." : "Save Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Shop */}
      {editingShop && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(10, 10, 12, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "rgba(23, 23, 28, 0.98)",
            border: "1px solid var(--border-color)",
            borderRadius: "20px",
            padding: "24px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
            color: "var(--text-primary)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaEdit style={{ color: "var(--primary)" }} /> Edit Shop Details
              </h3>
              <button
                onClick={() => setEditingShop(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Shop Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Platform / Channel
                </label>
                <select
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                >
                  {PLATFORM_OPTIONS.map(p => (
                    <option key={p.value} value={p.value} style={{ background: "var(--bg-secondary)" }}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="Active" style={{ background: "var(--bg-secondary)" }}>Active</option>
                  <option value="Inactive" style={{ background: "var(--bg-secondary)" }}>Inactive</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows="2"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="editIsDefaultCheck"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="editIsDefaultCheck" style={{ fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "var(--text-secondary)" }}>
                  Set as Primary Default Shop for new orders
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    border: "none",
                    background: "var(--primary)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "700",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
                  }}
                >
                  {submitting ? "Updating..." : "Update Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Shop Account?"
        message={`Are you sure you want to delete "${deleteShopName}"? Orders linked to this shop will remain in your accounts.`}
        confirmText="Yes, Delete Shop"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={alertOpen}
        title={alertTitle}
        message={alertMessage}
        confirmText="OK"
        isAlert={true}
        onConfirm={() => setAlertOpen(false)}
        onCancel={() => setAlertOpen(false)}
      />
    </div>
  );
}

export default Shops;
