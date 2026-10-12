import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  LogOut,
  ExternalLink,
  Search,
  Package,
  Layers,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
  Settings
} from 'lucide-react';
import { fetchProducts, deleteProduct, adminLogout, getFullImageUrl } from '../services/api';
import { useProducts } from '../context/ProductContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminSettings from '../components/AdminSettings';

export default function AdminDashboard({ defaultTab = 'products' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin } = useAdminAuth();
  const { refreshProducts } = useProducts();

  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') === 'settings' || defaultTab === 'settings' ? 'settings' : 'products';
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'settings' || defaultTab === 'settings') {
      setActiveView('settings');
    } else if (params.get('tab') === 'products') {
      setActiveView('products');
    }
  }, [location.search, defaultTab]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : (data.products || []));
      await refreshProducts();
    } catch (err) {
      setError(err.message || 'Failed to load products from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login', { replace: true });
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    setDeleteLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const targetId = productToDelete._id || productToDelete.id;
      await deleteProduct(targetId);
      setSuccessMessage(`Product "${productToDelete.name}" (${productToDelete.model}) was deleted successfully.`);
      setProductToDelete(null);
      await loadProducts();
      await refreshProducts();
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered and searched products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        categoryFilter === 'all' ||
        p.category === categoryFilter ||
        (categoryFilter === 'square' && (p.category === 'premium-square-drains' || p.category === 'tile-insert'));

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
      const name = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const model = (p.model || p.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const category = (p.categoryLabel || p.category || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      return name.includes(q) || model.includes(q) || category.includes(q);
    });
  }, [products, categoryFilter, searchQuery]);

  return (
    <div className="admin-dashboard-page">
      {/* Top Admin Navbar */}
      <header className="admin-header">
        <div className="container admin-header-container">
          <div className="admin-header-brand">
            <img
              src="/images/branding/saco-logo.png"
              alt="SACO Trading Company"
              className="admin-header-saco-logo"
            />
            <span className="admin-header-divider">|</span>
            <img
              src="/images/branding/clixer-logo.png"
              alt="CLIXER®"
              className="admin-header-clixer-logo"
            />
            <span className="admin-header-tag">Admin Dashboard</span>
          </div>

          <div className="admin-header-actions">
            {/* Admin Identity Badge */}
            <div className="admin-header-profile-badge" title="Authenticated Master Administrator">
              <ShieldCheck size={15} className="admin-header-badge-icon" />
              <span className="admin-header-badge-email">{admin?.email || 'Admin'}</span>
            </div>

            {/* Switch View Quick Button */}
            <button
              onClick={() => setActiveView(activeView === 'products' ? 'settings' : 'products')}
              className={`admin-header-btn ${activeView === 'settings' ? 'admin-active-nav-btn' : 'admin-view-site-btn'}`}
              title={activeView === 'products' ? 'Admin Settings' : 'Catalogue Management'}
            >
              {activeView === 'products' ? (
                <>
                  <Settings size={16} />
                  <span>Settings</span>
                </>
              ) : (
                <>
                  <Package size={16} />
                  <span>Catalogue</span>
                </>
              )}
            </button>

            <Link to="/" target="_blank" rel="noopener noreferrer" className="admin-header-btn admin-view-site-btn" title="View Public Website">
              <ExternalLink size={16} />
              <span>Public Website</span>
            </Link>

            <button onClick={handleLogout} className="admin-header-btn admin-logout-btn" title="Logout">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container admin-main">
        {/* Navigation Tabs between Product Catalogue and Admin Settings */}
        <div className="admin-main-nav-tabs">
          <button
            type="button"
            className={`admin-main-nav-tab ${activeView === 'products' ? 'active' : ''}`}
            onClick={() => setActiveView('products')}
          >
            <Package size={18} />
            <span>Product Catalogue ({products.length})</span>
          </button>
          <button
            type="button"
            className={`admin-main-nav-tab ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <Settings size={18} />
            <span>Admin Settings (Email & Password)</span>
          </button>
        </div>

        {/* View Selection: Account Settings vs Product Catalogue */}
        {activeView === 'settings' ? (
          <AdminSettings />
        ) : (
          <>
            {/* Alerts */}
            {successMessage && (
              <div className="admin-alert-success" role="alert">
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="admin-alert-close"
                  aria-label="Dismiss alert"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {error && (
              <div className="admin-alert-danger" role="alert">
                <AlertTriangle size={18} />
                <span>{error}</span>
                <button
                  onClick={() => setError('')}
                  className="admin-alert-close"
                  aria-label="Dismiss alert"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Dashboard Top Stats & Action Bar */}
            <div className="admin-dashboard-hero">
              <div className="admin-stat-card">
                <div className="admin-stat-icon-box">
                  <Package size={24} />
                </div>
                <div>
                  <span className="admin-stat-label">Total Products</span>
                  <h2 className="admin-stat-value">{products.length}</h2>
                </div>
              </div>

              <div className="admin-hero-actions">
                <button
                  onClick={loadProducts}
                  className="btn btn-secondary admin-refresh-btn"
                  title="Refresh catalogue"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
                  <span>Refresh</span>
                </button>

                <Link to="/admin/products/new" className="btn btn-primary admin-add-btn">
                  <Plus size={18} />
                  <span>Add New Product</span>
                </Link>
              </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="admin-toolbar">
              <div className="admin-search-wrapper">
                <Search size={18} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search by product name or model code (e.g. 8002, 801, Jack)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div className="admin-filter-pills">
                <button
                  className={`admin-filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  All ({products.length})
                </button>
                <button
                  className={`admin-filter-pill ${categoryFilter === 'channel-drainers' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('channel-drainers')}
                >
                  Channel Drainers
                </button>
                <button
                  className={`admin-filter-pill ${categoryFilter === 'premium-square-drains' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('premium-square-drains')}
                >
                  Square Grates
                </button>
                <button
                  className={`admin-filter-pill ${categoryFilter === 'tile-insert' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('tile-insert')}
                >
                  Tile Insert
                </button>
                <button
                  className={`admin-filter-pill ${categoryFilter === 'flat-cut' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('flat-cut')}
                >
                  Flat Cut
                </button>
                <button
                  className={`admin-filter-pill ${categoryFilter === 'other-products' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('other-products')}
                >
                  Other Accessories
                </button>
              </div>
            </div>

            {/* Products Management Table / Cards */}
            {loading ? (
              <div className="admin-loading-container">
                <div className="admin-spinner" />
                <p>Loading catalogue products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="admin-table-wrapper">
                <table className="admin-products-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Image</th>
                      <th>Product Name</th>
                      <th>Model / Code</th>
                      <th>Category</th>
                      <th>Available Sizes</th>
                      <th style={{ textAlign: 'right', width: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const pid = product._id || product.id;
                      const has202 = product.material && product.material.includes('202');

                      return (
                        <tr key={pid} className="admin-product-row">
                          {/* Image Thumbnail */}
                          <td className="admin-td-image">
                            <div className="admin-table-thumb-box">
                              <img
                                src={getFullImageUrl(product.image)}
                                alt={product.name}
                                className="admin-table-thumb"
                                onError={(e) => {
                                  e.currentTarget.src = '/images/branding/clixer-logo.png';
                                }}
                              />
                            </div>
                          </td>

                          {/* Product Name */}
                          <td className="admin-td-name">
                            <span className="admin-row-name">{product.name}</span>
                            {product.variant && (
                              <span className="admin-row-variant">{product.variant}</span>
                            )}
                          </td>

                          {/* Model / Code */}
                          <td className="admin-td-model">
                            <span className="admin-code-pill">{product.model || product.code}</span>
                          </td>

                          {/* Category & Material Badges */}
                          <td className="admin-td-cat">
                            <span className="admin-cat-label">{product.categoryLabel || product.category}</span>
                            <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span className="admin-mini-badge">AISI 304</span>
                              {has202 && <span className="admin-mini-badge admin-mini-badge-202">AISI 202</span>}
                            </div>
                          </td>

                          {/* Available Sizes */}
                          <td className="admin-td-sizes">
                            {product.availableSizes && product.availableSizes.length > 0 ? (
                              <div className="admin-sizes-chips-cell">
                                {product.availableSizes.map((size, idx) => (
                                  <span key={idx} className="admin-mini-size-chip">
                                    {size}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="admin-sizes-none">Standard / None</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="admin-td-actions">
                            <div className="admin-actions-cell">
                              <Link
                                to={`/admin/products/${pid}/edit`}
                                className="admin-action-btn admin-edit-action"
                                title="Edit Product"
                              >
                                <Edit2 size={15} />
                                <span>Edit</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => setProductToDelete(product)}
                                className="admin-action-btn admin-delete-action"
                                title="Delete Product"
                              >
                                <Trash2 size={15} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <Layers size={48} className="admin-empty-icon" />
                <h3>No products found</h3>
                <p>
                  {searchQuery
                    ? `No products match your search query "${searchQuery}".`
                    : 'No products in this category.'}
                </p>
                <Link to="/admin/products/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <Plus size={16} />
                  <span>Add Your First Product</span>
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal Dialog */}
      {productToDelete && (
        <div className="admin-modal-backdrop" onClick={() => !deleteLoading && setProductToDelete(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="admin-danger-icon-box">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="admin-modal-title">Delete Product</h3>
                <p className="admin-modal-desc">This action cannot be undone.</p>
              </div>
              <button
                onClick={() => setProductToDelete(null)}
                className="admin-modal-close-btn"
                disabled={deleteLoading}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: 0, color: 'var(--text-main, #0f172a)', fontSize: '0.98rem' }}>
                Are you sure you want to delete this product?
              </p>
              <div className="admin-delete-item-preview">
                <img
                  src={productToDelete.image}
                  alt={productToDelete.name}
                  className="admin-delete-item-thumb"
                />
                <div>
                  <strong>{productToDelete.name}</strong>
                  <div style={{ color: 'var(--primary, #c84b60)', fontWeight: 700, fontSize: '0.88rem' }}>
                    {productToDelete.model || productToDelete.code}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProductToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn admin-confirm-delete-btn"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span className="admin-btn-content">
                    <span className="admin-spinner-small" />
                    Deleting...
                  </span>
                ) : (
                  <span className="admin-btn-content">
                    <Trash2 size={16} />
                    Delete Product
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
