import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Check, MessageSquare, Package, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import MobileMenu from '../components/MobileMenu';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import CertificationStrip from '../components/CertificationStrip';
import SEO from '../components/SEO/SEO';
import { SEO_CONFIG } from '../config/seo';
import { fetchProductById, getFullImageUrl } from '../services/api';
import { useProducts } from '../context/ProductContext';
import { COMPANY_INFO, products as staticCatalogue } from '../data/products';

const DUAL_GRADE_CODES = ['CLX 101', 'CLX 102', 'CLX 103', 'CLX 110', 'CLX 801', 'CLX 802', 'CLX 807'];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { getProductById } = useProducts();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProductData = async () => {
      setLoading(true);
      setError(null);

      // Check context cache first for instant load
      const cached = getProductById(id);
      if (cached) {
        setProduct(cached);
        setSelectedSize(cached.availableSizes?.[0] || null);
        setLoading(false);
        return;
      }

      // Fetch from API
      try {
        const data = await fetchProductById(id);
        const prod = data?.product || data;
        if (isMounted) {
          if (prod && (prod._id || prod.id || prod.name)) {
            setProduct(prod);
            setSelectedSize(prod.availableSizes?.[0] || null);
          } else {
            setError('Product not found in catalogue.');
          }
        }
      } catch (err) {
        if (isMounted) {
          const fallback = staticCatalogue.find(
            p =>
              String(p.id || '').toLowerCase() === String(id).toLowerCase() ||
              String(p.customId || '').toLowerCase() === String(id).toLowerCase() ||
              String(p.code || '').toLowerCase() === String(id).toLowerCase() ||
              String(p.model || '').toLowerCase() === String(id).toLowerCase()
          );
          if (fallback) {
            setProduct(fallback);
            setSelectedSize(fallback.availableSizes?.[0] || null);
          } else {
            setError(err.message || 'Failed to load product details.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProductData();

    return () => {
      isMounted = false;
    };
  }, [id, getProductById]);

  const codeOrModel = product?.code || product?.model || '';
  const isDualGrade =
    product &&
    ((product.material && product.material.includes('202') && product.material.includes('304')) ||
      DUAL_GRADE_CODES.includes(codeOrModel));
  const hasAisi = product && ((product.material && product.material.includes('AISI')) || product.badge);

  const whatsappMessage = product
    ? encodeURIComponent(
        `Hello SACO / Clixer, I would like to enquire about ${product.name} (Model: ${codeOrModel}${
          selectedSize ? `, Size: ${selectedSize}` : ''
        }).`
      )
    : '';

  const whatsappUrl = `https://wa.me/${COMPANY_INFO.whatsapp}?text=${whatsappMessage}`;

  const pageTitle = product
    ? `${product.name} — ${codeOrModel} | ${SEO_CONFIG.siteName}`
    : `Product Details | ${SEO_CONFIG.siteName}`;
  const pageDescription = product
    ? `${product.name} ${codeOrModel} stainless steel architectural drainage solution by Clixer.`
    : SEO_CONFIG.defaultDescription;

  return (
    <div className="app-layout">
      {/* SEO HEAD */}
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonicalPath={`/products/${id}`}
        ogImage={product ? getFullImageUrl(product.image) : SEO_CONFIG.defaultOgImage}
        ogType="product"
      />

      {/* NAVBAR */}
      <Navbar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        activeSection="catalogue"
        onSelectCategory={() => navigate('/products')}
      />

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSelectCategory={() => navigate('/products')}
      />

      <main className="page-main-content">
        {/* BREADCRUMB / TOP ACTION BAR */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '1rem 0' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
              <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
              <span>/</span>
              <Link to="/products" style={{ color: '#64748b', textDecoration: 'none' }}>Products</Link>
              <span>/</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{product?.name || 'Details'}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/products')}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Catalogue</span>
            </button>
          </div>
        </div>

        {/* MAIN PRODUCT DETAIL SECTION */}
        <section style={{ padding: '3.5rem 0' }}>
          <div className="container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-muted)' }}>
                <Loader2 size={40} className="admin-spin" style={{ margin: '0 auto 1.25rem' }} />
                <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading product details...</p>
              </div>
            ) : error || !product ? (
              <div style={{ textAlign: 'center', padding: '6rem 1rem', maxWidth: '500px', margin: '0 auto' }}>
                <AlertCircle size={44} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Product Not Found
                </h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  {error || 'The requested product could not be found in the Clixer catalogue.'}
                </p>
                <Link to="/products" className="btn btn-primary">
                  <Package size={16} />
                  <span>Browse All Products</span>
                </Link>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '3rem',
                alignItems: 'start',
                background: '#ffffff',
                padding: '2.5rem',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                {/* LEFT: PRODUCT IMAGE */}
                <div style={{
                  position: 'relative',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '380px',
                  border: '1px solid #e2e8f0'
                }}>
                  {hasAisi && (
                    <div className="b2b-tags-container" style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 2 }}>
                      <span className="b2b-material-tag">
                        <ShieldCheck size={12} /> AISI 304
                      </span>
                      {isDualGrade && (
                        <span className="b2b-material-tag b2b-material-tag-202">
                          <ShieldCheck size={12} /> AISI 202
                        </span>
                      )}
                    </div>
                  )}

                  <img
                    src={getFullImageUrl(product.image)}
                    alt={`${product.name} ${codeOrModel}`}
                    style={{
                      maxHeight: '360px',
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.currentTarget.src = '/images/branding/clixer-logo.png';
                    }}
                  />
                </div>

                {/* RIGHT: PRODUCT DETAILS & SPECIFICATIONS */}
                <div>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.75rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    marginBottom: '0.75rem'
                  }}>
                    {product.categoryLabel || product.category || 'Clixer Stainless Drain'}
                  </div>

                  <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>
                    {product.name}
                  </h1>

                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--primary, #c84b60)',
                    letterSpacing: '0.5px',
                    marginBottom: '1.5rem'
                  }}>
                    {codeOrModel}
                  </div>

                  {/* Material & Spec Row */}
                  <div style={{
                    padding: '1.25rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, display: 'block' }}>
                          Material Grade
                        </span>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                          {product.material || 'AISI 304 Stainless Steel'}
                        </strong>
                      </div>

                      {product.series && (
                        <div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, display: 'block' }}>
                            Series / Collection
                          </span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                            {product.series}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Available Sizes Section */}
                  {product.availableSizes && product.availableSizes.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.85rem' }}>
                        Available Dimensions
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                        {product.availableSizes.map((size, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            style={{
                              padding: '0.6rem 1.1rem',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: selectedSize === size ? '2px solid var(--primary, #c84b60)' : '1.5px solid #cbd5e1',
                              background: selectedSize === size ? 'var(--primary, #c84b60)' : '#ffffff',
                              color: selectedSize === size ? '#ffffff' : '#0f172a'
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* B2B Enquiry Actions */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
                    >
                      <MessageSquare size={18} />
                      <span>Enquire on WhatsApp</span>
                    </a>

                    <a
                      href={`mailto:${COMPANY_INFO.email}?subject=Product Enquiry: ${encodeURIComponent(product.name)} (${encodeURIComponent(codeOrModel)})`}
                      className="btn btn-secondary"
                      style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
                    >
                      <span>Email Sales</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* TICKER */}
        <CertificationStrip />
      </main>

      {/* FOOTER */}
      <Footer onSelectCategory={() => navigate('/products')} />

      <ScrollToTop />
    </div>
  );
}
