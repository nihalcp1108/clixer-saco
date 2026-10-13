import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MobileMenu from '../components/MobileMenu';
import ProductGrid from '../components/ProductGrid';
import CertificationStrip from '../components/CertificationStrip';
import B2bCtaSection from '../components/B2bCtaSection';
import QualitySection from '../components/QualitySection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import ProductModal from '../components/ProductModal';
import ScrollToTop from '../components/ScrollToTop';
import SectionTitle from '../components/SectionTitle';
import SEO from '../components/SEO/SEO';
import { getPageStructuredData } from '../components/SEO/StructuredData';
import { SEO_CONFIG } from '../config/seo';
import { CATEGORIES } from '../data/products';
import { useProducts } from '../context/ProductContext';
import { Package, ArrowLeft } from 'lucide-react';

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const initialCat = searchParams.get('category') || 'all';
  const [activeCategory, setActiveCategory] = useState(initialCat);

  const { products: productsList, loading: productsLoading, error: productsError, refreshProducts } = useProducts();

  // Sync category with URL query param
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && CATEGORIES.some(c => c.id === cat)) {
      setActiveCategory(cat);
    } else if (!cat) {
      setActiveCategory('all');
    }
  }, [searchParams]);

  // Sync selected product with URL query param if present
  useEffect(() => {
    const prodId = searchParams.get('product');
    if (prodId) {
      const foundProduct = productsList.find(
        p => p.id === prodId || p._id === prodId || p.customId === prodId || p.model?.toLowerCase() === prodId.toLowerCase()
      );
      if (foundProduct) {
        setSelectedProduct(foundProduct);
      }
    }
  }, [searchParams, productsList]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    if (product) {
      const id = product._id || product.id || product.customId;
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('product', id);
        return next;
      });
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('product');
        return next;
      });
    }
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (catId && catId !== 'all') {
        next.set('category', catId);
      } else {
        next.delete('category');
      }
      next.delete('product');
      return next;
    });
  };

  const categoryObj = CATEGORIES.find(c => c.id === activeCategory);
  const categoryLabel = categoryObj ? categoryObj.label : 'All Products';

  let pageTitle = `All Products Catalogue | ${SEO_CONFIG.siteName}`;
  let pageDescription = "Explore the complete Clixer 304 range of linear channel drains, square grates, tile insert drains, and precision accessories.";
  let canonicalPath = '/products';

  if (activeCategory && activeCategory !== 'all') {
    pageTitle = `${categoryLabel} | ${SEO_CONFIG.siteName}`;
    canonicalPath = `/products?category=${activeCategory}`;
  }

  const structuredData = getPageStructuredData({
    product: selectedProduct,
    categoryId: activeCategory,
    categoryLabel: categoryLabel
  });

  return (
    <div className="app-layout">
      {/* DYNAMIC SEO HEAD SYSTEM */}
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        ogImage={SEO_CONFIG.defaultOgImage}
        ogType="website"
        structuredData={structuredData}
      />

      {/* 1. NAVIGATION HEADER */}
      <Navbar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        activeSection="catalogue"
        onSelectCategory={handleCategoryChange}
      />

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSelectCategory={handleCategoryChange}
      />

      <main className="page-main-content">
        {/* PAGE HEADER BANNER */}
        <section className="page-header-banner" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '3.5rem 1rem 3rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(200, 75, 96, 0.15)', color: 'var(--primary, #c84b60)', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1rem' }}>
              <Package size={14} />
              <span>Full Product Collection</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 800, margin: '0 0 1rem 0', color: '#ffffff' }}>
              Engineered Stainless Drain Catalogue
            </h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '680px', margin: '0 auto 1.5rem' }}>
              Discover our complete collection of AISI 304 stainless steel linear drains, square floor wastes, anti-odor protection traps, and tile accessories for modern architecture.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.18)' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </section>

        {/* PRODUCTS SECTION */}
        <section id="catalogue" className="catalogue-section" style={{ padding: '3.5rem 0' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
                  {categoryLabel}
                </h2>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {productsList.length} products available in catalogue
                </span>
              </div>
            </div>

            <ProductGrid
              onSelectProduct={handleSelectProduct}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              products={productsList}
              loading={productsLoading}
              error={productsError}
              onRetry={refreshProducts}
            />
          </div>
        </section>

        {/* CERTIFICATION TICKER */}
        <CertificationStrip />

        {/* B2B CTA */}
        <B2bCtaSection />

        {/* QUALITY SPOTLIGHT */}
        <QualitySection />

        {/* CONTACT SECTION */}
        <ContactSection />
      </main>

      {/* FOOTER */}
      <Footer onSelectCategory={handleCategoryChange} />

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => handleSelectProduct(null)}
        />
      )}

      {/* FLOATING SCROLL TO TOP */}
      <ScrollToTop />
    </div>
  );
}
