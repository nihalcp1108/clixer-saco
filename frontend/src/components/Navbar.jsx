import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Search, X, ArrowRight, Shield, Package } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { isAdminAuthenticated, getFullImageUrl } from '../services/api';
import { useProducts } from '../context/ProductContext';

export default function Navbar({ onOpenMobileMenu, activeSection, onSelectCategory }) {
  const [desktopScrolled, setDesktopScrolled] = useState(false);
  const [mobileScrolled, setMobileScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const mobileScrolledRef = useRef(false);
  const desktopScrolledRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { products } = useProducts();

  // Scroll detection:
  // Desktop: visible after scrolling past 80px (on home) or immediately on other pages
  // Mobile: strictly hidden when scrollY <= 10; smoothly appears when scrollY > 10 (or when search is open)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY || 0;
          const isMobile = currentY > 10;
          const isDesktop = currentY > 80;

          if (isMobile !== mobileScrolledRef.current) {
            mobileScrolledRef.current = isMobile;
            setMobileScrolled(isMobile);
          }

          if (isDesktop !== desktopScrolledRef.current) {
            desktopScrolledRef.current = isDesktop;
            setDesktopScrolled(isDesktop);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    // Check initial position on mount for desktop only
    const initialY = window.scrollY || 0;
    if (initialY > 80) {
      desktopScrolledRef.current = true;
      setDesktopScrolled(true);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-focus search input when search opens & clear query when closed
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Close search on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Reset search and scroll to top on route change to ensure mobile navbar starts hidden
  useEffect(() => {
    setSearchOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mobileScrolledRef.current = false;
    setMobileScrolled(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Home', sectionId: 'hero', path: '/' },
    { label: 'About Us', sectionId: 'why-saco', path: '/#why-saco' },
    { label: 'Products', sectionId: 'catalogue', catId: 'all', path: '/products' },
    { label: 'Quality', sectionId: 'quality', path: '/#quality' },
    { label: 'Contact', sectionId: 'contact', path: '/#contact' },
  ];

  const handleNavClick = (e, item) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      if (item.path === '/products') {
        navigate('/products');
      } else {
        navigate(`/${item.sectionId ? '#' + item.sectionId : ''}`);
      }
      return;
    }

    if (item.catId && onSelectCategory) {
      onSelectCategory(item.catId);
    }
    const targetEl = document.getElementById(item.sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    if (isAdminAuthenticated()) {
      navigate('/admin');
    } else {
      navigate('/admin/login');
    }
  };

  // Filter products matching live query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return (products || []).filter((p) => {
      const name = (p.name || '').toLowerCase();
      const model = (p.model || p.code || '').toLowerCase();
      const cat = (p.categoryLabel || p.category || '').toLowerCase();
      return name.includes(q) || model.includes(q) || cat.includes(q);
    });
  }, [products, searchQuery]);

  const handleProductSelect = (product) => {
    const pid = product._id || product.id || product.customId;
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/products/${pid}`);
  };

  const isDesktopVisible = desktopScrolled || location.pathname !== '/';
  const isMobileVisible = mobileScrolled || searchOpen;

  return (
    <header className={`navbar ${isDesktopVisible ? 'visible scrolled' : ''} ${isMobileVisible ? 'mobile-visible' : ''}`}>
      {/* =========================================================================
          1. DESKTOP NAVBAR (Kept intact for screens > 992px)
          ========================================================================= */}
      <div className="container desktop-nav-content">
        {/* Brand Group */}
        <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img 
            src="/images/branding/saco-logo.png" 
            alt="SACO Trading Company" 
            className="nav-logo-saco"
            style={{ height: '28px', objectFit: 'contain' }} 
          />
          <span className="nav-logo-divider" style={{ color: 'var(--text-muted)', fontWeight: 300, fontSize: '1.2rem' }}>|</span>
          <img 
            src="/images/branding/clixer-logo.png" 
            alt="CLIXER®" 
            className="nav-logo-clixer"
            style={{ height: '28px', objectFit: 'contain' }} 
          />
        </Link>

        {/* Desktop Nav Links */}
        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.label}>
              <a 
                href={`#${item.sectionId}`} 
                onClick={(e) => handleNavClick(e, item)}
                className={`nav-link ${activeSection === item.sectionId ? 'active' : ''}`}
              >
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={handleAdminClick}
              className="nav-link nav-link-admin-text"
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Shield size={14} />
              <span>Admin</span>
            </button>
          </li>
        </ul>

        {/* Right Action CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleAdminClick}
            className="nav-admin-btn"
            title={isAdminAuthenticated() ? 'Open Admin Dashboard' : 'Admin Login'}
            aria-label="Admin Portal"
          >
            <Shield size={14} />
            <span>Admin</span>
          </button>

          <a 
            href="#contact" 
            onClick={(e) => handleNavClick(e, { sectionId: 'contact' })}
            className="btn btn-primary nav-enquire-btn"
          >
            <span>ENQUIRE NOW</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE NAVBAR (Exact 3-Element Grid: Hamburger | Centered Logo | Search)
          ========================================================================= */}
      <div className="mobile-nav-bar">
        {/* LEFT: Hamburger Menu Toggle Button */}
        <div className="mobile-nav-left">
          <button 
            type="button"
            className="mobile-nav-btn mobile-hamburger-btn"
            onClick={onOpenMobileMenu}
            aria-label="Open Navigation Menu"
            title="Open Menu"
          >
            <Menu size={26} strokeWidth={2.2} />
          </button>
        </div>

        {/* CENTER: Clixer Brand Logo (Mathematically Centered via CSS Grid) */}
        <div className="mobile-nav-center">
          <Link to="/" className="mobile-nav-logo-link" aria-label="CLIXER® - SACO Trading Company">
            <img 
              src="/images/branding/clixer-logo-lg.png" 
              alt="CLIXER®" 
              className="mobile-nav-logo-img" 
            />
          </Link>
        </div>

        {/* RIGHT: Compact Search Control Button */}
        <div className="mobile-nav-right">
          <button
            type="button"
            className={`mobile-nav-btn mobile-search-btn ${searchOpen ? 'active' : ''}`}
            onClick={() => setSearchOpen(prev => !prev)}
            aria-label={searchOpen ? 'Close Search' : 'Open Product Search'}
            title={searchOpen ? 'Close Search' : 'Search Products'}
          >
            {searchOpen ? <X size={24} strokeWidth={2.2} /> : <Search size={24} strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. EXPANDABLE MOBILE SEARCH PANEL (Directly Beneath Mobile Navbar)
          ========================================================================= */}
      {searchOpen && (
        <>
          <div className="mobile-search-backdrop" onClick={() => setSearchOpen(false)} />
          <div className="mobile-search-panel" role="region" aria-label="Mobile Product Search">
            <div className="mobile-search-input-box">
              <Search size={18} className="mobile-search-input-icon" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search products by model, code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-search-field"
                aria-label="Search catalogue"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="mobile-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search input"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Live Search Results */}
            {searchQuery.trim().length > 0 && (
              <div className="mobile-search-results">
                {searchResults.length > 0 ? (
                  <>
                    <div className="mobile-search-results-header">
                      <span>Products Found ({searchResults.length})</span>
                    </div>
                    <div className="mobile-search-results-list">
                      {searchResults.slice(0, 8).map((product) => {
                        const pid = product._id || product.id || product.customId;
                        return (
                          <div
                            key={pid}
                            className="mobile-search-result-item"
                            onClick={() => handleProductSelect(product)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleProductSelect(product)}
                          >
                            <img
                              src={getFullImageUrl(product.image)}
                              alt={product.name}
                              className="mobile-search-thumb"
                              onError={(e) => {
                                e.currentTarget.src = '/images/branding/clixer-logo.png';
                              }}
                            />
                            <div className="mobile-search-result-info">
                              <span className="mobile-search-result-name">{product.name}</span>
                              <div className="mobile-search-result-meta">
                                <span className="mobile-search-result-code">{product.model || product.code}</span>
                                <span className="mobile-search-result-cat">{product.categoryLabel || product.category}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mobile-search-empty">
                    <Package size={30} className="mobile-search-empty-icon" />
                    <p>No products found matching "<strong>{searchQuery}</strong>"</p>
                    <button
                      type="button"
                      className="btn btn-secondary mobile-search-view-all"
                      onClick={() => {
                        setSearchOpen(false);
                        navigate('/products');
                      }}
                    >
                      Browse Full Catalogue
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
