import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShieldCheck } from 'lucide-react';
import SEO from './SEO/SEO';
import { SEO_CONFIG } from '../config/seo';
import { getFullImageUrl } from '../services/api';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

export default function ProductModal({ product, onClose }) {
  const [activeImage, setActiveImage] = useState(product?.image);
  const [selectedSize, setSelectedSize] = useState(product?.availableSizes?.[0] || null);

  useEffect(() => {
    if (product) {
      setActiveImage(product.image);
      setSelectedSize(product.availableSizes?.[0] || null);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Lock background scrolling while modal is open
    lockScroll();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!product) return null;

  const codeOrModel = product.code || product.model || '';

  // Build clean gallery if alternative views exist
  const galleryImages = [
    { src: product.image, label: 'Main View' },
    ...(product.colorsImage ? [{ src: product.colorsImage, label: 'Catalogue Finishes' }] : [])
  ];

  const DUAL_GRADE_CODES = ['CLX 101', 'CLX 102', 'CLX 103', 'CLX 110', 'CLX 801', 'CLX 802', 'CLX 807'];

  const isDualGrade =
    (product.material && product.material.includes('202') && product.material.includes('304')) ||
    DUAL_GRADE_CODES.includes(codeOrModel);

  const hasAisi = (product.material && product.material.includes('AISI')) || product.badge;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <SEO
        title={`${product.name} — ${product.code} | ${SEO_CONFIG.siteName}`}
        description={`${product.name} — ${product.code}`}
        canonicalPath={`?product=${product.id}`}
        ogImage={product.image}
        ogType="product"
      />

      <div className="modal-container modal-container-minimal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close product view">
          <X size={20} />
        </button>

        <div className="modal-minimal-content">
          {/* 1. Large Product Image / Gallery */}
          <div className="modal-gallery-wrapper">
            <div className="modal-large-image-box" style={{ position: 'relative' }}>
              {hasAisi && (
                <div className="b2b-tags-container" style={{ top: '1rem', left: '1rem', zIndex: 5 }}>
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
                src={getFullImageUrl(activeImage || product.image)}
                alt={`${product.name} - ${codeOrModel}`}
                className="modal-large-img"
                onError={(e) => {
                  e.currentTarget.src = '/images/branding/clixer-logo.png';
                }}
              />
            </div>

            {galleryImages.length > 1 && (
              <div className="modal-gallery-thumbs">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`modal-thumb-btn ${activeImage === img.src ? 'active' : ''}`}
                    onClick={() => setActiveImage(img.src)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={getFullImageUrl(img.src)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Product Name & 3. Product Code / Variant */}
          <div className="modal-minimal-info">
            <h2 className="modal-minimal-name">{product.name}</h2>
            <div className="modal-minimal-code">{codeOrModel}</div>

            {/* 4. Available Sizes (where applicable) */}
            {product.availableSizes && product.availableSizes.length > 0 && (
              <div className="modal-available-sizes">
                <h4 className="modal-sizes-title">Available Sizes</h4>
                <div className="modal-sizes-grid">
                  {product.availableSizes.map((size, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`modal-size-chip ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                      aria-label={`Select size ${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Link to Full Product Details Page */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <Link
                to={`/products/${product._id || product.id || product.customId || encodeURIComponent(product.model || '')}`}
                onClick={onClose}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '0.65rem 1rem' }}
              >
                <span>View Full Product Page</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

