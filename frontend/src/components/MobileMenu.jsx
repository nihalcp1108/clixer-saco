import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Shield,
  Award,
  Info,
  PhoneCall,
  MessageSquare,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { COMPANY_INFO, CATEGORIES } from '../data/products';
import { isAdminAuthenticated } from '../services/api';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

export default function MobileMenu({ isOpen, onClose, onSelectCategory }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Prevent background scrolling while drawer is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
  }, [isOpen]);

  // Support keyboard Escape to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavClick = (e, targetPath, sectionId = null) => {
    if (e) e.preventDefault();
    onClose();

    if (sectionId) {
      if (location.pathname === '/') {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      navigate(`/${'#' + sectionId}`);
      return;
    }

    if (targetPath) {
      navigate(targetPath);
    }
  };

  const handleCategoryClick = (catId) => {
    onClose();
    if (onSelectCategory && location.pathname === '/') {
      onSelectCategory(catId);
      const catEl = document.getElementById('catalogue');
      if (catEl) {
        catEl.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/products?category=${catId}`);
  };

  const handleAdminClick = () => {
    onClose();
    if (isAdminAuthenticated()) {
      navigate('/admin');
    } else {
      navigate('/admin/login');
    }
  };

  const isAuth = isAdminAuthenticated();

  return (
    <>
      {/* Backdrop Overlay */}
      <div 
        className={`mobile-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
        aria-hidden={!isOpen}
      />

      {/* Navigation Drawer (Opens from Left) */}
      <div 
        className={`mobile-menu ${isOpen ? 'open' : ''}`} 
        role="dialog" 
        aria-modal="true" 
        aria-label="Site Navigation"
      >
        {/* Drawer Header */}
        <div className="mobile-menu-header">
          <Link to="/" onClick={onClose} className="mobile-drawer-brand" aria-label="CLIXER® Home">
            <img 
              src="/images/branding/saco-logo.png" 
              alt="SACO" 
              className="mobile-drawer-saco-logo"
            />
            <span className="mobile-drawer-divider">|</span>
            <img 
              src="/images/branding/clixer-logo.png" 
              alt="CLIXER®" 
              className="mobile-drawer-clixer-logo"
            />
          </Link>

          <button 
            type="button"
            onClick={onClose} 
            className="mobile-menu-close-btn"
            aria-label="Close navigation menu"
            title="Close Menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <div className="mobile-menu-body">
          <ul className="mobile-menu-nav-list">
            {/* 1. Home */}
            <li>
              <button
                type="button"
                className={`mobile-menu-item ${location.pathname === '/' && !location.hash ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, '/', 'hero')}
              >
                <Home size={19} className="mobile-item-icon" />
                <span>Home</span>
              </button>
            </li>

            {/* 2. All Products */}
            <li>
              <button
                type="button"
                className={`mobile-menu-item ${location.pathname === '/products' && !location.search ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, '/products')}
              >
                <Package size={19} className="mobile-item-icon" />
                <span>All Products</span>
              </button>
            </li>

            {/* 3. Product Categories Accordion */}
            <li className="mobile-menu-accordion-group">
              <button
                type="button"
                className={`mobile-menu-item mobile-menu-accordion-trigger ${categoriesOpen ? 'expanded' : ''}`}
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                aria-expanded={categoriesOpen}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Layers size={19} className="mobile-item-icon" />
                  <span>Product Categories</span>
                </div>
                {categoriesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {categoriesOpen && (
                <ul className="mobile-submenu-list">
                  {CATEGORIES.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        className="mobile-submenu-item"
                        onClick={() => handleCategoryClick(cat.id)}
                      >
                        <span className="mobile-submenu-dot" />
                        <span>{cat.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* 4. Quality Standards */}
            <li>
              <button
                type="button"
                className={`mobile-menu-item ${location.hash === '#quality' ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, null, 'quality')}
              >
                <Award size={19} className="mobile-item-icon" />
                <span>Quality Standards</span>
              </button>
            </li>

            {/* 5. About SACO */}
            <li>
              <button
                type="button"
                className={`mobile-menu-item ${location.hash === '#why-saco' ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, null, 'why-saco')}
              >
                <Info size={19} className="mobile-item-icon" />
                <span>About Us</span>
              </button>
            </li>

            {/* 6. Contact */}
            <li>
              <button
                type="button"
                className={`mobile-menu-item ${location.hash === '#contact' ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, null, 'contact')}
              >
                <PhoneCall size={19} className="mobile-item-icon" />
                <span>Contact & Sales</span>
              </button>
            </li>
          </ul>

          {/* ADMIN PORTAL SECTION INSIDE DRAWER (Removed from visible navbar) */}
          <div className="mobile-menu-admin-section">
            <span className="mobile-admin-section-label">Management</span>
            <button
              type="button"
              onClick={handleAdminClick}
              className={`mobile-menu-admin-card ${isAuth ? 'authenticated' : ''}`}
              title={isAuth ? 'Go to Admin Dashboard' : 'Sign in as Administrator'}
            >
              <div className="mobile-admin-card-icon">
                {isAuth ? <ShieldCheck size={20} /> : <Shield size={20} />}
              </div>
              <div className="mobile-admin-card-text">
                <span className="mobile-admin-card-title">
                  {isAuth ? 'Admin Dashboard' : 'Admin Login'}
                </span>
                <span className="mobile-admin-card-subtitle">
                  {isAuth ? 'Administrator Active' : 'Master Credential Access'}
                </span>
              </div>
              <ArrowRight size={16} className="mobile-admin-card-arrow" />
            </button>
          </div>
        </div>

        {/* Drawer Footer with Actions */}
        <div className="mobile-menu-footer">
          <button
            type="button"
            onClick={(e) => handleNavClick(e, null, 'contact')}
            className="btn btn-primary mobile-drawer-btn"
          >
            <span>ENQUIRE NOW</span>
            <ArrowRight size={15} />
          </button>

          <a
            href={`https://wa.me/${COMPANY_INFO.whatsapp}?text=Hello%20SACO%20Trading,%20I%20have%20a%20B2B%20inquiry.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mobile-drawer-btn mobile-whatsapp-btn"
          >
            <MessageSquare size={16} />
            <span>WhatsApp Inquiry</span>
          </a>

          <div className="mobile-drawer-corp-info">
            <strong>{COMPANY_INFO.marketedBy}</strong>
            <span>{COMPANY_INFO.material}</span>
          </div>
        </div>
      </div>
    </>
  );
}
