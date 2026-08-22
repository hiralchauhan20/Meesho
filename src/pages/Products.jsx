import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaEdit, FaBoxes, FaTags, FaTimes, FaSearch } from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";
import { API_URL } from "../config";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states for adding product
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Apparel");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [gst, setGst] = useState("18");
  const [quantity, setQuantity] = useState("0");

  // Edit states
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductName, setEditProductName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editGst, setEditGst] = useState("18");
  const [editQuantity, setEditQuantity] = useState("0");

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Notice");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, title = "Notice") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch products data");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productName.trim() || !purchasePrice || !sellingPrice) {
      showAlert("Please fill in the Product Name, Buying Price, and Selling Price.", "Validation Error");
      return;
    }

    try {
      const payload = {
        productName: productName.trim(),
        category: category,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        gst: Number(gst),
        quantity: Number(quantity) || 0,
      };

      const res = await fetch(`${API_URL}/api/products/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add product");
      }

      // Reset form
      setProductName("");
      setPurchasePrice("");
      setSellingPrice("");
      setGst("18");
      setQuantity("0");

      fetchProducts();
      showAlert("Product added successfully!", "Success");
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setEditProductName(p.productName);
    setEditCategory(p.category || "Apparel");
    setEditPurchasePrice(String(p.purchasePrice));
    setEditSellingPrice(String(p.sellingPrice));
    setEditGst(String(p.gst || 0));
    setEditQuantity(String(p.quantity || 0));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editProductName.trim() || !editPurchasePrice || !editSellingPrice) {
      showAlert("Please fill in the Product Name, Buying Price, and Selling Price.", "Validation Error");
      return;
    }

    try {
      const payload = {
        productName: editProductName.trim(),
        category: editCategory,
        purchasePrice: Number(editPurchasePrice),
        sellingPrice: Number(editSellingPrice),
        gst: Number(editGst),
        quantity: Number(editQuantity) || 0,
      };

      const res = await fetch(`${API_URL}/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update product");

      setEditingProduct(null);
      fetchProducts();
      showAlert("Product updated successfully!", "Success");
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  const handleDeleteProduct = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    if (!deleteId) return;

    try {
      const res = await fetch(`${API_URL}/api/products/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete product");

      setProducts(products.filter((p) => p._id !== deleteId));
      showAlert("Product deleted successfully!", "Success");
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setDeleteId(null);
    }
  };

  // Unique categories for filtering
  const categories = ["Apparel", "Home Decor", "Electronics", "Beauty & Care", "Footwear", "Other"];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? p.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 10px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div className="page-title-group">
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>Products</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Add, update, and manage your product catalog with purchase and selling prices
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Main Grid: Form Left, Product List Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
        
        {/* Left Side: Add Product Form */}
        <form 
          onSubmit={handleAddProduct}
          style={{ 
            background: "var(--glass-bg)", 
            border: "1px solid var(--border-color)", 
            borderRadius: "12px", 
            padding: "24px",
            boxShadow: "var(--glass-shadow)",
            backdropFilter: "var(--glass-blur)"
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "var(--primary)" }}>
            <FaBoxes /> Add New Product
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label>Product Name</label>
              <input 
                type="text" 
                placeholder="e.g. Air Bra (Pack of 3)" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label>Buying Price (₹)</label>
                <input 
                  type="number" 
                  placeholder="Purchase price" 
                  value={purchasePrice} 
                  onChange={(e) => setPurchasePrice(e.target.value)} 
                  required 
                  min="0"
                />
              </div>
              <div>
                <label>Selling Price (₹)</label>
                <input 
                  type="number" 
                  placeholder="Sales price" 
                  value={sellingPrice} 
                  onChange={(e) => setSellingPrice(e.target.value)} 
                  required 
                  min="0"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label>GST (%)</label>
                <select value={gst} onChange={(e) => setGst(e.target.value)}>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
              <div>
                <label>Initial Stock (Qty)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 100" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  min="0"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", height: "42px", marginTop: "10px" }}
            >
              <FaPlus /> Add Product
            </button>
          </div>
        </form>

        {/* Right Side: Product Catalog List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Search and filter bar */}
          <div style={{ 
            background: "var(--glass-bg)", 
            border: "1px solid var(--border-color)", 
            borderRadius: "12px", 
            padding: "16px",
            boxShadow: "var(--glass-shadow)",
            display: "flex",
            gap: "16px",
            alignItems: "center"
          }}>
            <div style={{ position: "relative", flex: 1 }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "13px", color: "var(--text-muted)", fontSize: "13px" }} />
              <input 
                type="text" 
                placeholder="Search products by name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "36px", height: "38px", fontSize: "13px" }}
              />
            </div>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ width: "180px", height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Table Container */}
          <div className="table-container">
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                Loading product catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                No products found. Add your first product on the left panel!
              </div>
            ) : (
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Buying Price</th>
                    <th style={{ textAlign: "right" }}>Selling Price</th>
                    <th style={{ textAlign: "center" }}>GST</th>
                    <th style={{ textAlign: "center" }}>Stock</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{p.productName}</td>
                      <td>
                        <span className="badge badge-info">{p.category || "Apparel"}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", color: "var(--warning)" }}>
                        ₹{p.purchasePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", color: "var(--success)" }}>
                        ₹{p.sellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "center" }}>{p.gst || 0}%</td>
                      <td style={{ textAlign: "center", fontWeight: "600" }}>{p.quantity || 0}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button 
                            onClick={() => startEdit(p)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "var(--primary)", 
                              cursor: "pointer",
                              padding: "4px",
                              fontSize: "14px"
                            }}
                            title="Edit Product"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p._id)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "var(--danger)", 
                              cursor: "pointer",
                              padding: "4px",
                              fontSize: "14px"
                            }}
                            title="Delete Product"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div style={{
          position: "fixed",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            width: "100%",
            maxWidth: "450px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "var(--glass-shadow)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaEdit /> Edit Product Details
              </h3>
              <button 
                onClick={() => setEditingProduct(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Product Name</label>
                <input 
                  type="text" 
                  value={editProductName} 
                  onChange={(e) => setEditProductName(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <label>Category</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Buying Price (₹)</label>
                  <input 
                    type="number" 
                    value={editPurchasePrice} 
                    onChange={(e) => setEditPurchasePrice(e.target.value)} 
                    required 
                    min="0"
                  />
                </div>
                <div>
                  <label>Selling Price (₹)</label>
                  <input 
                    type="number" 
                    value={editSellingPrice} 
                    onChange={(e) => setEditSellingPrice(e.target.value)} 
                    required 
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>GST (%)</label>
                  <select value={editGst} onChange={(e) => setEditGst(e.target.value)}>
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label>Current Stock (Qty)</label>
                  <input 
                    type="number" 
                    value={editQuantity} 
                    onChange={(e) => setEditQuantity(e.target.value)} 
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingProduct(null)} 
                  style={{ flex: 1, height: "40px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, height: "40px" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertOpen && (
        <div style={{
          position: "fixed",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyHierarchy: "center",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1100
        }}>
          <div style={{
            width: "100%",
            maxWidth: "350px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
            boxShadow: "var(--glass-shadow)"
          }}>
            <h4 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px" }}>{alertTitle}</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>{alertMessage}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setAlertOpen(false)}
              style={{ width: "100%", height: "38px" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </div>
  );
}

export default Products;
