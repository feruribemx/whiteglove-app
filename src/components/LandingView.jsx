import React, { useState, useEffect } from 'react';
import {
  Sparkles, Shield, Clock, CheckCircle2, MessageCircle, ArrowRight,
  Star, Globe, Instagram, Building2, Home, RefreshCw, Layers,
  ShoppingBag, MapPin, ChevronRight, BadgeCheck, Check, Phone,
  Eye, X, Mail, Send, Calendar, AlertCircle, Loader2, FileText,
  Edit3, Trash2, Plus
} from 'lucide-react';
import { saveInquiryToFirestore } from '../lib/firebase';
import {
  getSavedReviews,
  saveReviewsToCloud,
  subscribeReviewsFromCloud,
  formatReviewTimeAgo,
  ADMIN_TIME_PRESETS,
} from '../lib/reviews';
import { hasFullAccess } from '../lib/auth';

export default function LandingView({ onGoToLogin, currentUser }) {
  // Default language is English; when toggled to Spanish, 100% of the page switches to Spanish
  const [lang, setLang] = useState('en');

  // Lightbox Modal for HD Luxury Interior Inspection
  const [lightboxImage, setLightboxImage] = useState(null);

  // Interactive Service Showcase Tab (Prioritizing Deep Clean & Luxury Housekeeping)
  const [activeServiceTab, setActiveServiceTab] = useState('deepclean');

  // Interactive Quote Calculator State (Luxury Residence & Deep Clean first; includes bathrooms & currency)
  const [calcProperty, setCalcProperty] = useState('residence');
  const [calcBedrooms, setCalcBedrooms] = useState('3');
  const [calcBathrooms, setCalcBathrooms] = useState('2');
  const [calcType, setCalcType] = useState('deepclean');
  const [currency, setCurrency] = useState('CAD'); // 'CAD' | 'USD' | 'MXN'

  // Interactive FAQ Accordion State
  const [openFaqIdx, setOpenFaqIdx] = useState(0);
  const [faqCategory, setFaqCategory] = useState('all'); // 'all' | 'service' | 'security' | 'billing'

  // Dynamic calculation of estimated hours, crew size, and reference price range in selected currency
  const getEstimateDetails = () => {
    const beds = calcBedrooms === '4+' ? 4 : Number(calcBedrooms) || 2;
    const baths = calcBathrooms === '4+' ? 4 : Number(calcBathrooms) || 2;
    const typeExtra = calcType === 'deepclean' || calcType === 'moveinout' ? 1.5 : 0;
    const propExtra = calcProperty === 'residence' ? 0.5 : 0;
    const minH = Math.max(2.5, 1.5 + beds * 0.5 + baths * 0.5 + typeExtra + propExtra);
    const maxH = minH + 1;
    const crew = beds >= 3 || calcType === 'moveinout' || calcType === 'deepclean' ? '2' : '1–2';

    // Reference hourly billing rate per hub currency
    let ratePerHour = 55; // CAD base
    if (currency === 'USD') ratePerHour = 50;
    if (currency === 'MXN') ratePerHour = 480;

    const minPrice = Math.round((minH * ratePerHour) / 5) * 5;
    const maxPrice = Math.round((maxH * ratePerHour) / 5) * 5;
    const formattedPrice =
      currency === 'MXN'
        ? `$${minPrice.toLocaleString('en-US')} – $${maxPrice.toLocaleString('en-US')} MXN`
        : `$${minPrice} – $${maxPrice} ${currency}`;

    return {
      minH,
      maxH,
      crew,
      minPrice,
      maxPrice,
      formattedPrice,
      currency,
    };
  };

  // Alternative Online Quote / Contact Form State (Propuesta #1 - Lead Capture)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('Toronto & GTA');
  const [formAddress, setFormAddress] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formContactPref, setFormContactPref] = useState('whatsapp');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmittedFolio, setFormSubmittedFolio] = useState(null);
  const [formError, setFormError] = useState('');

  // Handle direct online quote submission to Cloud Firestore
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError(lang === 'en' ? 'Please enter your full name.' : 'Por favor ingresa tu nombre completo.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError(
        lang === 'en'
          ? 'Please enter the property address or street/postal code so we can anticipate travel distance.'
          : 'Por favor ingresa la dirección o ubicación de la propiedad para anticipar la distancia.'
      );
      return;
    }
    if (!formPhone.trim() && !formEmail.trim()) {
      setFormError(
        lang === 'en'
          ? 'Please enter either a phone number or email address so we can contact you.'
          : 'Por favor ingresa un teléfono o correo electrónico para contactarte.'
      );
      return;
    }

    setFormSubmitting(true);
    const folioCode = `WG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const propLabel = (calcProperty === 'residence') ? (lang === 'en' ? 'Luxury Residence / Estate' : 'Residencia Privada / Casa de Lujo')
      : (calcProperty === 'condo') ? (lang === 'en' ? 'Condo / Penthouse' : 'Condominio / Penthouse')
      : (calcProperty === 'airbnb') ? (lang === 'en' ? 'Airbnb / Rental Property' : 'Airbnb / Renta Vacacional')
      : (lang === 'en' ? 'Commercial / Boutique Office' : 'Oficina / Local Comercial');

    const serviceLabel = (calcType === 'deepclean') ? (lang === 'en' ? 'Deep Clean & Restoration' : 'Limpieza Profunda & Detallado')
      : (calcType === 'housekeeping') ? (lang === 'en' ? 'Regular Luxury Housekeeping' : 'Housekeeping Residencial Continuo')
      : (calcType === 'turnover') ? (lang === 'en' ? 'Airbnb Turnover & Linen Reset' : 'Turnover Airbnb y Blancos')
      : (lang === 'en' ? 'Move-In / Move-Out transformation' : 'Mudanza y Entrega de Llaves');

    const est = getEstimateDetails();

    const inquiryData = {
      folio: folioCode,
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      city: formCity,
      address: formAddress.trim(),
      propertyType: propLabel,
      bedrooms: calcBedrooms,
      bathrooms: calcBathrooms,
      serviceType: serviceLabel,
      currency: est.currency,
      estimatedRange: est.formattedPrice,
      estimatedHours: `${est.minH}–${est.maxH} hrs`,
      desiredDate: formDate || 'Flexible',
      notes: formNotes.trim(),
      contactPreference: formContactPref,
      lang: lang,
      status: 'nueva',
      createdAt: new Date().toISOString(),
    };

    try {
      await saveInquiryToFirestore(inquiryData);
      setFormSubmittedFolio(inquiryData);
      setFormNotes('');
    } catch (err) {
      console.error('Error saving quote inquiry:', err);
      setFormError(
        lang === 'en'
          ? 'Unable to submit right now. Please try again or reach our team via WhatsApp.'
          : 'No se pudo enviar en este momento. Inténtalo de nuevo o contáctanos por WhatsApp.'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  // WhatsApp Configuration
  const phone = '14168840601';

  // Dynamic calculated estimated message for WhatsApp
  const getCustomizedQuoteMsg = () => {
    const propLabels = {
      en: {
        residence: 'Luxury Residence / Estate',
        condo: 'Condo / Penthouse',
        airbnb: 'Airbnb / Rental Property',
        office: 'Commercial / Boutique Office',
      },
      es: {
        residence: 'Residencia Privada / Casa de Lujo',
        condo: 'Condominio / Penthouse',
        airbnb: 'Airbnb / Renta Vacacional',
        office: 'Oficina / Local Boutique',
      }
    };

    const typeLabels = {
      en: {
        deepclean: 'Deep Clean & Restoration',
        housekeeping: 'Regular Luxury Housekeeping',
        turnover: 'Airbnb Turnover & Linen Reset',
        moveinout: 'Move-In / Move-Out transformation',
      },
      es: {
        deepclean: 'Limpieza Profunda & Detallado',
        housekeeping: 'Housekeeping Residencial Continuo',
        turnover: 'Turnover Airbnb y Blancos',
        moveinout: 'Mudanza y Entrega de Llaves',
      }
    };

    const propertyText = (propLabels[lang] && propLabels[lang][calcProperty]) || calcProperty.toUpperCase();
    const serviceText = (typeLabels[lang] && typeLabels[lang][calcType]) || calcType.toUpperCase();
    const est = getEstimateDetails();

    const addressPartEn = formAddress.trim() ? ` located at ${formAddress.trim()}` : '';
    const addressPartEs = formAddress.trim() ? ` ubicada en ${formAddress.trim()}` : '';

    if (lang === 'en') {
      return encodeURIComponent(
        `Hi WhiteGlove! I would like to request an estimate in ${est.currency} (Ref: ${est.formattedPrice}, est. ${est.minH}–${est.maxH} hrs) for a ${propertyText} with ${calcBedrooms} bedroom(s) and ${calcBathrooms} bathroom(s) (${serviceText})${addressPartEn}.`
      );
    }
    return encodeURIComponent(
      `¡Hola WhiteGlove! Me gustaría solicitar una cotización en ${est.currency} (Ref: ${est.formattedPrice}, est. ${est.minH}–${est.maxH} hrs) para ${propertyText} de ${calcBedrooms} recámara(s) y ${calcBathrooms} baño(s) (${serviceText})${addressPartEs}.`
    );
  };

  const genericWhatsAppMsg = lang === 'en'
    ? encodeURIComponent('Hi! I\'d like to request a quote for cleaning services with WhiteGlove.')
    : encodeURIComponent('¡Hola! Me gustaría pedir una cotización para servicio de limpieza con WhiteGlove.');

  // Comprehensive, 100% Isolated Bilingual Dictionary
  const content = {
    en: {
      tagline: 'Professional Cleaning. Exceptional Care.',
      portalLogin: 'Client & Team Portal',
      heroTag: 'THE SUPREME STANDARD IN LUXURY CARE',
      heroHeadline: 'Exceptional Spaces. Impeccable Care.',
      heroSubhead: 'Precision residential cleaning, seamless Airbnb turnovers, and commercial property care delivered with 5-star hotel meticulousness.',
      guaranteeBadge: '100% Cleanliness Guarantee',
      vettedBadge: '100% Background-Checked & Uniformed Specialists',
      ratingBadge: '5.0 Superhost Reviews',
      instantQuoteCta: 'Get an Instant Quote on WhatsApp',
      exploreServices: 'Explore Services',
      quickResponseNotice: 'Quick response via WhatsApp in Toronto, Hamilton, Seattle & Guadalajara.',
      verifiedInspectionTitle: 'WhiteGlove Inspection Verified',
      verifiedInspectionSubtitle: '50-Point Property Checklist Passed',
      bookTurn: 'Book Service',
      stats1Label: 'Turnovers Delivered',
      stats2Label: 'On-Time Arrival Rate',
      stats3Label: 'Average Host Rating',
      stats4Label: 'Countries Served',
      showcaseOverline: 'Interactive Showcase',
      showcaseTitle: 'Tailored for High-Value Properties',
      showcaseSubtitle: 'Select a category to inspect our specialized protocols and deliverables.',
      tabDeepclean: 'Deep Cleaning & Restoration',
      tabResidential: 'Luxury Residences & Housekeeping',
      tabAirbnb: 'Airbnb & Turnovers',
      tabCommercial: 'Commercial & Boutique Retail',
      tabMoveinout: 'Move-In / Move-Out',
      recommendedFor: 'Recommended for:',
      bookServiceWhatsapp: 'Book This Service on WhatsApp →',
      calculatorOverline: 'Instant Estimator',
      calculatorTitle: 'Calculate Your Custom Service Estimate',
      calculatorSubtitle: 'Get a direct personalized quote tailored to your property size and frequency in under 60 seconds.',
      propTypeLabel: '1. Property Type',
      bedroomsLabel: '2. Bedrooms / Space',
      bathroomsLabel: '3. Bathrooms',
      serviceTypeLabel: '4. Service Scope',
      optResidence: 'Luxury Residence / Estate',
      optCondo: 'Condo / Penthouse',
      optAirbnb: 'Airbnb / Vacation Rental',
      optOffice: 'Commercial / Boutique Office',
      bed1: '1 Bed / Studio',
      bed2: '2 Bedrooms',
      bed3: '3 Bedrooms',
      bed4: '4+ Bedrooms / Large',
      bath1: '1 Bath',
      bath2: '2 Baths',
      bath3: '3 Baths',
      bath4: '4+ Baths',
      scopeDeep: 'Deep Clean & Detailing (Best Seller)',
      scopeHousekeeping: 'Regular Luxury Housekeeping',
      scopeTurnover: 'Airbnb Turnover & Linen Reset',
      scopeMoveinout: 'Move-In / Move-Out Transformation',
      selectedScopeLabel: 'Selected Scope',
      availableInHubs: '✓ Available for Toronto, Hamilton, Seattle & Guadalajara',
      requestCalculatedQuote: 'Book This Estimate via WhatsApp →',
      comparisonOverline: 'Value Transparency',
      comparisonTitle: 'The WhiteGlove Standard vs. Standard Cleaners',
      comparisonSub: 'Why top luxury homeowners and Airbnb Superhosts trust us across North America.',
      colStandard: 'Service Standard',
      colWhiteGlove: 'WhiteGlove Standard',
      colOther: 'Standard Cleaners',
      compRow1Feat: 'Quality Supervision',
      compRow1Wg: 'Internal checklist & attention to detail',
      compRow1Other: 'Unverified / No follow-up',
      compRow2Feat: 'Products & Equipment',
      compRow2Wg: 'Equipped when needed & adaptable to your surfaces',
      compRow2Other: 'Generic harsh store chemicals',
      compRow3Feat: 'Short-Term Rental Support',
      compRow3Wg: 'Crisp hotel-style presentation & restock alerts',
      compRow3Other: 'Basic bedding changes without communication',
      compRow4Feat: 'Team & Trust',
      compRow4Wg: 'Trusted, trained & uniformed team members',
      compRow4Other: 'Unscreened casual gig workers',
      compRow5Feat: 'Customer Follow-up',
      compRow5Wg: 'Direct communication & personalized care',
      compRow5Other: 'No follow-up / Slow resolution',
      areasOverline: 'Regional Hubs',
      areasTitle: 'International Operations',
      areasSubtitle: 'Consistent executive standards across Canada, the United States, and Mexico.',
      canadaTitle: 'CANADA',
      canadaHub: 'Ontario Operations',
      canadaCities: 'Toronto & GTA: Downtown, Yorkville, Yonge & Eglinton, St. Lawrence, Mississauga, Oakville, Burlington, Markham. Hamilton: Downtown, Ancaster.',
      canadaBtn: 'Book Ontario Team →',
      usaTitle: 'UNITED STATES',
      usaHub: 'Washington Operations',
      usaCities: 'Seattle: Central Seattle & selected metropolitan communities (subject to scheduling availability).',
      usaBtn: 'Book Seattle Team →',
      mexicoTitle: 'MEXICO',
      mexicoHub: 'Jalisco Operations',
      mexicoCities: 'Guadalajara: Downtown, Zapopan, Providencia, Puerta de Hierro and selected metropolitan zones.',
      mexicoBtn: 'Book Guadalajara Team →',
      areasDisclaimer: '*Service availability may vary by location and schedule booking.',
      reviewsOverline: 'Client Endorsements',
      reviewsTitle: 'Trusted by Superhosts and Discerning Owners',
      ctaTitle: 'Ready to elevate your property to the WhiteGlove standard?',
      ctaSubtitle: 'Contact our operations team on WhatsApp for prompt scheduling, property onboarding, and custom estimates.',
      ctaButton: 'Chat with Operations on WhatsApp →',
      instagramFollow: 'Follow @whitegloveps on Instagram',
      servingCountries: 'Serving Canada, the United States, and Mexico.',
      navAbout: 'About',
      navServices: 'Services',
      navEstimate: 'Estimate',
      navStandard: 'Standard',
      navAreas: 'Locations',
      navReviews: 'Reviews',
      navContact: 'Contact',
      fillOnlineFormCta: 'Or Request Online (No WhatsApp Needed) ↓',
      formOverline: 'Alternative Web Request',
      formTitle: 'Request a Formal Online Estimate',
      formSubtitle: 'No WhatsApp required. Enter your property details and our operations desk will prepare a personalized proposal.',
      formNameLabel: 'Full Name *',
      formEmailLabel: 'Email Address *',
      formPhoneLabel: 'Phone / WhatsApp *',
      formCityLabel: 'Operational Hub / City *',
      formAddressLabel: 'Property Address (Street, Number & Postal Code) *',
      formAddressPlaceholder: 'e.g., 120 Yorkville Ave, Toronto, ON M5R 1C2 (helps us estimate travel distance)',
      calcAddressLabel: '5. Property Address / Location (To anticipate travel distance)',
      formDateLabel: 'Tentative Service Date',
      formNotesLabel: 'Special Instructions, Property Access or Requirements',
      formNotesPlaceholder: 'e.g., Square footage, pet details, key lockbox code, high-ceiling windows...',
      formPrefContact: 'Preferred Way to Receive Quote',
      formPrefWhatsapp: 'WhatsApp Chat',
      formPrefEmail: 'Email PDF / Summary',
      formPrefPhone: 'Phone Call',
      formSubmitBtn: 'Submit Quote Request to WhiteGlove',
      formSubmittingText: 'Registering your request...',
      formSuccessTitle: 'Quote Request Registered Successfully!',
      formSuccessSubtitle: 'Your request has been routed to our operations team. You will be contacted within 2 business hours.',
      formFolioLabel: 'Official Tracking Folio',
      formSendFolioWa: 'Send Folio via WhatsApp Now',
      formSubmitAnother: 'Submit Another Inquiry',
    },
    es: {
      tagline: 'Limpieza profesional. Cuidado excepcional.',
      portalLogin: 'Acceso al Portal',
      heroTag: 'EL ESTÁNDAR SUPREMO EN CUIDADO RESIDENCIAL',
      heroHeadline: 'Espacios Excepcionales. Cuidado Impecable.',
      heroSubhead: 'Limpieza residencial de precisión, preparación impecable de Airbnb y cuidado comercial entregados con la meticulosidad de un hotel 5 estrellas.',
      guaranteeBadge: 'Garantía 100% de Calidad',
      vettedBadge: 'Personal 100% Verificado',
      ratingBadge: 'Calificación 5.0 de Huéspedes',
      instantQuoteCta: 'Cotizar al instante por WhatsApp',
      exploreServices: 'Ver Servicios',
      quickResponseNotice: 'Respuesta inmediata por WhatsApp en Toronto, Hamilton, Seattle y Guadalajara.',
      verifiedInspectionTitle: 'Inspección WhiteGlove Verificada',
      verifiedInspectionSubtitle: 'Checklist de 50 Puntos Aprobado',
      bookTurn: 'Agendar Turno',
      stats1Label: 'Turnos Completados',
      stats2Label: 'Puntualidad Operativa',
      stats3Label: 'Calificación de Huéspedes',
      stats4Label: 'Países con Cobertura',
      showcaseOverline: 'Catálogo Interactivo',
      showcaseTitle: 'Diseñado para Propiedades de Alto Valor',
      showcaseSubtitle: 'Selecciona una categoría para ver nuestros protocolos y entregables especializados.',
      tabAirbnb: 'Airbnb y Turnos',
      tabResidential: 'Residencias Privadas',
      tabDeepclean: 'Limpieza Profunda',
      tabCommercial: 'Oficinas y Retail',
      tabMoveinout: 'Mudanzas',
      recommendedFor: 'Recomendado para:',
      bookServiceWhatsapp: 'Agendar este Servicio por WhatsApp →',
      calculatorOverline: 'Cotizador Rápido',
      calculatorTitle: 'Calcula tu Estimación Personalizada',
      calculatorSubtitle: 'Obtén una cotización directa adaptada al tamaño y requerimientos de tu propiedad en menos de 60 segundos.',
      propTypeLabel: '1. Tipo de Propiedad',
      bedroomsLabel: '2. Recámaras / Espacio',
      bathroomsLabel: '3. Número de Baños',
      serviceTypeLabel: '4. Alcance del Servicio',
      optResidence: 'Residencia Privada / Casa de Lujo',
      optCondo: 'Condominio / Penthouse',
      optAirbnb: 'Airbnb / Renta Vacacional',
      optOffice: 'Comercial / Oficina Boutique',
      bed1: '1 Recámara / Estudio',
      bed2: '2 Recámaras',
      bed3: '3 Recámaras',
      bed4: '4+ Recámaras / Grande',
      bath1: '1 Baño',
      bath2: '2 Baños',
      bath3: '3 Baños',
      bath4: '4+ Baños',
      scopeDeep: 'Limpieza Profunda & Detallado (Más Vendido)',
      scopeHousekeeping: 'Housekeeping Residencial Continuo',
      scopeTurnover: 'Turnover Airbnb y Blancos',
      scopeMoveinout: 'Mudanza y Entrega de Llaves',
      selectedScopeLabel: 'Configuración Seleccionada',
      availableInHubs: '✓ Disponible en Toronto, Hamilton, Seattle y Guadalajara',
      requestCalculatedQuote: 'Confirmar esta Estimación por WhatsApp →',
      comparisonOverline: 'Transparencia de Valor',
      comparisonTitle: 'El Estándar WhiteGlove vs. Limpieza Tradicional',
      comparisonSub: 'Por qué los anfitriones Airbnb y propietarios de residencias de lujo nos eligen.',
      colStandard: 'Estándar del Servicio',
      colWhiteGlove: 'Estándar WhiteGlove',
      colOther: 'Limpieza Convencional',
      compRow1Feat: 'Supervisión y Cuidado',
      compRow1Wg: 'Checklist interno y atención al detalle',
      compRow1Other: 'Sin revisión ni seguimiento',
      compRow2Feat: 'Equipo y Productos',
      compRow2Wg: 'Llevamos equipo e insumos en caso de necesitarlo',
      compRow2Other: 'Productos genéricos sin cuidado de superficies',
      compRow3Feat: 'Apoyo en Airbnb y Rentas',
      compRow3Wg: 'Presentación estilo hotel y aviso de insumos',
      compRow3Other: 'Cambio básico sin comunicación con el anfitrión',
      compRow4Feat: 'Personal de Confianza',
      compRow4Wg: 'Equipo capacitado, de confianza y uniformado',
      compRow4Other: 'Personal eventual sin capacitación',
      compRow5Feat: 'Atención y Seguimiento',
      compRow5Wg: 'Comunicación directa y atención personalizada',
      compRow5Other: 'Sin seguimiento ni respuesta ágil',
      areasOverline: 'Sedes Regionales',
      areasTitle: 'Operaciones Internacionales',
      areasSubtitle: 'Estándares ejecutivos uniformes en Canadá, Estados Unidos y México.',
      canadaTitle: 'CANADÁ',
      canadaHub: 'Sede Ontario',
      canadaCities: 'Toronto & GTA: Downtown, Yorkville, Yonge & Eglinton, St. Lawrence, Mississauga, Oakville, Burlington, Markham. Hamilton: Downtown, Ancaster.',
      canadaBtn: 'Agendar en Ontario →',
      usaTitle: 'ESTADOS UNIDOS',
      usaHub: 'Sede Washington',
      usaCities: 'Seattle: Centro de Seattle y comunidades metropolitanas seleccionadas (sujeto a disponibilidad).',
      usaBtn: 'Agendar en Seattle →',
      mexicoTitle: 'MÉXICO',
      mexicoHub: 'Sede Jalisco',
      mexicoCities: 'Guadalajara: Centro, Zapopan, Providencia, Puerta de Hierro y zonas metropolitanas seleccionadas.',
      mexicoBtn: 'Agendar en Guadalajara →',
      areasDisclaimer: '*Disponibilidad sujeta a agenda en cada ciudad.',
      reviewsOverline: 'Opiniones Verificadas',
      reviewsTitle: 'La Confianza de Superhosts y Propietarios',
      ctaTitle: '¿Listo para elevar tu propiedad al estándar WhiteGlove?',
      ctaSubtitle: 'Comunícate con nuestro equipo operativo por WhatsApp para cotizaciones ágiles y fechas disponibles.',
      ctaButton: 'Hablar con Operaciones por WhatsApp →',
      instagramFollow: 'Seguir a @whitegloveps en Instagram',
      servingCountries: 'Sirviendo Canadá, Estados Unidos y México.',
      navAbout: 'Nosotros',
      navServices: 'Servicios',
      navEstimate: 'Cotizar',
      navStandard: 'Estándar',
      navAreas: 'Sedes',
      navReviews: 'Testimonios',
      navContact: 'Contacto',
      fillOnlineFormCta: 'O Solicitar en Línea Sin WhatsApp ↓',
      formOverline: 'Solicitud Web Directa',
      formTitle: 'Solicita una Cotización en Línea',
      formSubtitle: 'Sin necesidad de WhatsApp. Registra los requerimientos de tu propiedad y nuestro equipo de operaciones te enviará una propuesta formal.',
      formNameLabel: 'Nombre Completo *',
      formEmailLabel: 'Correo Electrónico *',
      formPhoneLabel: 'Teléfono o Celular *',
      formCityLabel: 'Sede Operativa / Ciudad *',
      formAddressLabel: 'Dirección de la Propiedad (Calle, Número y C.P. para anticipar distancia) *',
      formAddressPlaceholder: 'Ej: 120 Yorkville Ave, Toronto / Av. Patria 1500, Zapopan...',
      calcAddressLabel: '5. Dirección o Ubicación de la Propiedad (Para anticipar distancia)',
      formDateLabel: 'Fecha Tentativa de Servicio',
      formNotesLabel: 'Detalles Especiales, Acceso a la Propiedad o Requerimientos',
      formNotesPlaceholder: 'Ej: Metros cuadrados, mascotas, código de entrada o locker, ventanales altos...',
      formPrefContact: 'Forma Preferida de Contacto',
      formPrefWhatsapp: 'Mensaje de WhatsApp',
      formPrefEmail: 'Envío de Cotización por Correo',
      formPrefPhone: 'Llamada Telefónica',
      formSubmitBtn: 'Enviar Solicitud a WhiteGlove',
      formSubmittingText: 'Registrando tu solicitud...',
      formSuccessTitle: '¡Solicitud Registrada con Éxito!',
      formSuccessSubtitle: 'Tu requerimiento ha sido canalizado a nuestra coordinación operativa. Te contactaremos en menos de 2 horas hábiles.',
      formFolioLabel: 'Folio Oficial de Seguimiento',
      formSendFolioWa: 'Enviar Folio por WhatsApp Ahora',
      formSubmitAnother: 'Enviar Otra Solicitud',
    }
  };

  const t = content[lang];

  // Visual Services Showcase Definitions with Real Photos
  const serviceShowcaseData = {
    deepclean: {
      id: 'deepclean',
      title: lang === 'en' ? 'Deep Cleaning & Restoration' : 'Limpieza Profunda y Detallado',
      tagline: lang === 'en' ? 'Meticulous detailing beyond everyday surfaces.' : 'Detallado minucioso más allá del mantenimiento diario.',
      imageSrc: '/images/deep_clean.jpg',
      fallbackSrc: '/images/deep_clean.webp',
      imageAlt: 'Luxury Open-Plan Kitchen & Island Deep Clean Sanctuary',
      highlights: [
        lang === 'en' ? 'Interior appliance degreasing (ovens, refrigerators, hoods)' : 'Desengrase interior de hornos, refrigeradores y campanas',
        lang === 'en' ? 'Grout descaling, sanitary tile polish & calcium removal' : 'Desincrustación de sarro, pulido de azulejos y grifería',
        lang === 'en' ? 'Baseboards, door frames, switch plates & high fixtures' : 'Zoclos, molduras de puertas, apagadores y luminarias altas',
        lang === 'en' ? 'Full interior glass and window frame detailing' : 'Limpieza de cristales interiores y canceles de baño',
      ],
      idealFor: lang === 'en' ? 'Seasonal resets, pre-holiday hosting & deep property care' : 'Puestas a punto estacionales, eventos especiales y resets anuales',
    },
    residential: {
      id: 'residential',
      title: lang === 'en' ? 'Luxury Residential & Housekeeping' : 'Limpieza Residencial y Penthouse',
      tagline: lang === 'en' ? 'A pristine home. Zero chemical residue.' : 'Un hogar impecable. Cero residuos químicos.',
      imageSrc: '/images/toronto_luxury_estate_facade.jpg',
      fallbackSrc: '/images/toronto_luxury_estate_facade.webp',
      imageAlt: 'Grand Luxury Estate Mansion Facade in Toronto',
      highlights: [
        lang === 'en' ? 'Stone-safe, pH-neutral care for marble, quartz & hardwood' : 'Cuidado pH neutro para mármol, cuarzo y madera fina',
        lang === 'en' ? 'Discreet, background-checked and uniformed cleaning specialists' : 'Especialistas uniformados, discretos y con antecedentes verificados',
        lang === 'en' ? 'Customized weekly, bi-weekly or monthly maintenance routines' : 'Rutinas personalizadas semanales, quincenales o mensuales',
        lang === 'en' ? 'Zero harsh synthetic fumes — safe for family and pets' : 'Sin químicos abrasivos — 100% seguro para niños y mascotas',
      ],
      idealFor: lang === 'en' ? 'Private homeowners, luxury estates & executive residences' : 'Grandes residencias privadas, casas de lujo y condominios ejecutivos',
    },
    airbnb: {
      id: 'airbnb',
      title: lang === 'en' ? 'Airbnb & Short-Term Rental Turnovers' : 'Turnovers Airbnb y Rentas Cortas',
      tagline: lang === 'en' ? 'Flawless guest transitions. 5.0 cleanliness reviews.' : 'Turnos impecables. Calificaciones 5.0 garantizadas.',
      imageSrc: '/images/toronto_condo_living_room.jpg',
      fallbackSrc: '/images/toronto_condo_living_room.webp',
      imageAlt: 'Modern Downtown Toronto Condo Living Room',
      highlights: [
        lang === 'en' ? 'Hotel-grade crisp linen folding & bed presentation' : 'Tendido de cama y doblado de blancos estilo hotel 5 estrellas',
        lang === 'en' ? 'Restocking essentials & custom guest inventory check' : 'Reposición de insumos y chequeo de inventario para huéspedes',
        lang === 'en' ? 'Photographic pre/post condition report sent to host' : 'Reporte fotográfico enviado al anfitrión al terminar',
        lang === 'en' ? 'Rapid same-day turnover scheduling between check-in/out' : 'Coordinación ágil el mismo día entre check-out y check-in',
      ],
      idealFor: lang === 'en' ? 'Airbnb Superhosts, VRBO owners & remote property managers' : 'Superhosts de Airbnb, anfitriones VRBO y administradores a distancia',
    },
    commercial: {
      id: 'commercial',
      title: lang === 'en' ? 'Commercial, Office & Boutique Retail' : 'Oficinas Ejecutivas y Tiendas Retail',
      tagline: lang === 'en' ? 'Every detail reflects the prestige of your brand.' : 'Cada detalle refleja el prestigio de tu marca.',
      imageSrc: '/images/toronto_boutique_retail_clothing.jpg',
      fallbackSrc: '/images/toronto_boutique_retail_clothing.webp',
      imageAlt: 'Luxury Fashion Clothing Boutique & Retail Store in Toronto',
      highlights: [
        lang === 'en' ? 'Streak-free glass boardrooms and executive suites' : 'Salas de juntas de cristal sin marcas ni reflejos opacos',
        lang === 'en' ? 'Sanitization of high-touch technology & desk spaces' : 'Sanitización de equipos, teléfonos y zonas de alto contacto',
        lang === 'en' ? 'Flexible after-hours scheduling to prevent business disruption' : 'Turnos fuera de horario laboral para no interrumpir tu operación',
        lang === 'en' ? 'Consistent corporate billing and digital sign-offs' : 'Facturación corporativa organizada y reportes digitales',
      ],
      idealFor: lang === 'en' ? 'Law firms, tech offices, luxury retail stores & boutique studios' : 'Despachos jurídicos, agencias, tiendas boutique y marcas exclusivas',
    },
    moveinout: {
      id: 'moveinout',
      title: lang === 'en' ? 'Move-In & Move-Out Transformations' : 'Mudanzas (Entrega y Recepción)',
      tagline: lang === 'en' ? 'Turnkey cleanliness ready for keys.' : 'Propiedades impecables listas para entregar llaves.',
      imageSrc: '/images/toronto_house_living_room.jpg',
      fallbackSrc: '/images/toronto_house_living_room.webp',
      imageAlt: 'Pristine Toronto Luxury House Living Room (Move-In Ready)',
      highlights: [
        lang === 'en' ? '100% deposit-ready and inspection-passed cleanliness' : 'Garantía de entrega lista para devolución de depósito',
        lang === 'en' ? 'Cabinetry interior sterilization & drawer vacuuming' : 'Aspirado y desinfección interna de clósets y alacenas',
        lang === 'en' ? 'Thorough floor scrubbing, edge detailing and sanitization' : 'Lavado profundo de pisos, orillas y rincones difíciles',
        lang === 'en' ? 'Seamless coordination with moving schedules' : 'Coordinación puntual con tu agenda de mudanza y fletes',
      ],
      idealFor: lang === 'en' ? 'Tenants, real estate agents, landlords & property buyers' : 'Inquilinos, agentes inmobiliarios, propietarios y compradores',
    },
  };

  const currentShowcase = serviceShowcaseData[activeServiceTab] || serviceShowcaseData.airbnb;

  // Client Reviews State (Newest First, Cloud Synced)
  const [reviewsList, setReviewsList] = useState(() => getSavedReviews());
  const [isLeaveReviewOpen, setIsLeaveReviewOpen] = useState(false);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewLocation, setNewReviewLocation] = useState('');
  const [newReviewStars, setNewReviewStars] = useState(5);
  const [newReviewHoverStars, setNewReviewHoverStars] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewError, setNewReviewError] = useState('');
  const [newReviewSuccess, setNewReviewSuccess] = useState(false);

  // Admin Review Editing State (Allows Admin to edit "hace cuánto fue publicado", stars, name, or text)
  const effectiveUser =
    currentUser ||
    (() => {
      try {
        const raw = localStorage.getItem('wg-current-user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
  const isAdminUser = hasFullAccess(effectiveUser);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewDraft, setEditReviewDraft] = useState({
    name: '',
    location: '',
    review: '',
    stars: 5,
    publishedAt: '',
    customTimeLabel: '',
  });

  useEffect(() => {
    const unsub = subscribeReviewsFromCloud((cloudReviews) => {
      setReviewsList(cloudReviews);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleSubmitClientReview = async (e) => {
    e.preventDefault();
    setNewReviewError('');
    if (!newReviewName.trim()) {
      setNewReviewError(
        lang === 'en' ? 'Please enter your name.' : 'Por favor ingresa tu nombre.'
      );
      return;
    }
    if (!newReviewText.trim() || newReviewText.trim().length < 8) {
      setNewReviewError(
        lang === 'en'
          ? 'Please write a short comment about your experience.'
          : 'Por favor escribe tu reseña o comentario del servicio.'
      );
      return;
    }

    const cleanLocation =
      newReviewLocation.trim() ||
      (lang === 'en' ? 'Verified WhiteGlove Client' : 'Cliente Verificado WhiteGlove');

    const createdReview = {
      id: `rev-${Date.now()}`,
      name: newReviewName.trim(),
      locationEn: cleanLocation,
      locationEs: cleanLocation,
      reviewEn: newReviewText.trim(),
      reviewEs: newReviewText.trim(),
      stars: Number(newReviewStars) || 5,
      publishedAt: new Date().toISOString(),
      customTimeLabel: '',
    };

    const updated = await saveReviewsToCloud([createdReview, ...reviewsList]);
    setReviewsList(updated);
    setNewReviewName('');
    setNewReviewLocation('');
    setNewReviewStars(5);
    setNewReviewText('');
    setIsLeaveReviewOpen(false);
    setNewReviewSuccess(true);
    setTimeout(() => setNewReviewSuccess(false), 5000);
  };

  const handleStartEditReview = (rev) => {
    setEditingReviewId(rev.id);
    setEditReviewDraft({
      name: rev.name || '',
      location: (lang === 'en' ? rev.locationEn || rev.location : rev.locationEs || rev.location) || '',
      review: (lang === 'en' ? rev.reviewEn || rev.review : rev.reviewEs || rev.review) || '',
      stars: Number(rev.stars) || 5,
      publishedAt: rev.publishedAt || new Date().toISOString(),
      customTimeLabel: rev.customTimeLabel || '',
    });
  };

  const handleApplyAdminTimePreset = (preset) => {
    const newIso = new Date(Date.now() - preset.offsetMs).toISOString();
    setEditReviewDraft((prev) => ({
      ...prev,
      publishedAt: newIso,
      customTimeLabel: '',
    }));
  };

  const handleSaveAdminReviewEdit = async (reviewId) => {
    const nextList = reviewsList.map((r) => {
      if (r.id !== reviewId) return r;
      return {
        ...r,
        name: editReviewDraft.name.trim() || r.name,
        locationEn: editReviewDraft.location.trim() || r.locationEn,
        locationEs: editReviewDraft.location.trim() || r.locationEs,
        reviewEn: editReviewDraft.review.trim() || r.reviewEn,
        reviewEs: editReviewDraft.review.trim() || r.reviewEs,
        stars: Math.min(5, Math.max(1, Number(editReviewDraft.stars) || 5)),
        publishedAt: editReviewDraft.publishedAt || r.publishedAt || new Date().toISOString(),
        customTimeLabel: editReviewDraft.customTimeLabel.trim(),
      };
    });
    const saved = await saveReviewsToCloud(nextList);
    setReviewsList(saved);
    setEditingReviewId(null);
  };

  const handleDeleteReview = async (reviewId) => {
    const nextList = reviewsList.filter((r) => r.id !== reviewId);
    const saved = await saveReviewsToCloud(nextList);
    setReviewsList(saved);
    setEditingReviewId(null);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0B1D4A] selection:bg-[#FFB566] selection:text-[#0B1D4A] flex flex-col font-sans">
      
      {/* 1. STICKY TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#0B1D4A]/95 backdrop-blur-md text-white border-b border-[#1E3670]/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Wordmark & Official Emblem */}
          <a href="#" className="flex items-center gap-3 shrink-0">
            <img
              src="/logo.webp"
              alt="WhiteGlove"
              className="w-9 h-9 object-contain rounded-full shadow-sm ring-1 ring-[#FFB566]/40"
            />
            <div className="flex flex-col">
              <span className="font-serif text-lg tracking-wide font-medium text-[#FAF7F1] leading-none">
                WhiteGlove
              </span>
              <span className="text-[10px] tracking-widest uppercase text-slate-300 font-medium mt-0.5">
                Professional Services
              </span>
            </div>
          </a>

          {/* Clean Nav Links (Strictly in active language) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#services" className="hover:text-white transition-colors">{t.navServices}</a>
            <a href="#calculator" className="hover:text-white transition-colors">{t.navEstimate}</a>
            <a href="#comparison" className="hover:text-white transition-colors">{t.navStandard}</a>
            <a href="#areas" className="hover:text-white transition-colors">{t.navAreas}</a>
            <a href="#reviews" className="hover:text-white transition-colors">{t.navReviews}</a>
            <a href="#faq" className="hover:text-white transition-colors">{lang === 'en' ? 'FAQ' : 'Preguntas'}</a>
            <a href="#contact" className="hover:text-white transition-colors">{t.navContact}</a>
          </nav>

          {/* Action Zone: Currency Selector + Language toggle + Portal Login button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Multi-Currency Selector (CAD / USD / MXN) */}
            <div
              className="hidden sm:flex items-center bg-[#1E3670] p-0.5 rounded-lg text-[11px] font-bold border border-slate-700/60"
              title={lang === 'en' ? 'Select preferred currency' : 'Seleccionar moneda de cotización'}
            >
              {['CAD', 'USD', 'MXN'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    currency === curr
                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            {/* Bilingual Switcher */}
            <div className="flex items-center bg-[#1E3670] p-0.5 rounded-lg text-xs font-bold border border-slate-700/60">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === 'en'
                    ? 'bg-[#FFB566] text-[#0B1D4A] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('es')}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === 'es'
                    ? 'bg-[#FFB566] text-[#0B1D4A] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ES
              </button>
            </div>

            {/* Portal Login */}
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#FFB566] to-[#E89A45] text-[#0B1D4A] font-bold text-xs rounded-xl hover:brightness-105 active:scale-[0.98] transition-all shadow-sm whitespace-nowrap"
            >
              <span>{t.portalLogin}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HIGH-IMPACT HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: High-Intent Sales Pitch */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1D4A] text-[#FFB566] text-[11px] font-bold tracking-widest uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB566]" />
                <span>{t.heroTag}</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#0B1D4A] leading-[1.12]">
                {t.heroHeadline}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t.heroSubhead}
              </p>

              {/* Trust Badges Bar */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1 text-xs text-slate-700 font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t.guaranteeBadge}</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Shield className="w-4 h-4 text-[#0B1D4A]" />
                  <span>{t.vettedBadge}</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-800">
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                  <span>{t.ratingBadge}</span>
                </span>
              </div>

              {/* Main CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
                <a
                  href={`https://wa.me/${phone}?text=${genericWhatsAppMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4 fill-current text-[#0B1D4A]" />
                  <span>{t.instantQuoteCta}</span>
                </a>

                <a
                  href="#services"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <span>{t.exploreServices}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              </div>

              <p className="text-xs text-slate-400 italic">
                {t.quickResponseNotice}
              </p>
            </div>

            {/* Right Column: Real Luxury Interior Photo with Floating Verified Card */}
            <div className="lg:col-span-6 relative">
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white group cursor-pointer"
                onClick={() => setLightboxImage({
                  src: '/images/whiteglove_inspection_verified.jpg',
                  fallbackSrc: '/images/whiteglove_inspection_verified.webp',
                  alt: 'WhiteGlove Inspection Verified',
                  title: 'WhiteGlove Inspection Verified Standard'
                })}
              >
                <img
                  src="/images/whiteglove_inspection_verified.jpg"
                  alt="WhiteGlove Inspection Verified"
                  className="w-full h-80 sm:h-96 object-cover transition-transform duration-500 group-hover:scale-102"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/whiteglove_inspection_verified.webp';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061434]/80 via-transparent to-transparent"></div>
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Click to inspect in HD' : 'Clic para ampliar en HD'}</span>
                </div>
                
                {/* Floating Inspection Card Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.webp"
                      alt="WhiteGlove"
                      className="w-11 h-11 rounded-full object-contain ring-2 ring-[#FFB566]/60 shrink-0"
                    />
                    <div>
                      <span className="font-serif font-bold text-sm text-[#0B1D4A] block">
                        {t.verifiedInspectionTitle}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.verifiedInspectionSubtitle}</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${phone}?text=${genericWhatsAppMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {t.bookTurn}
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. SALES METRIC RIBBON */}
      <section className="bg-[#0B1D4A] text-white py-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#FFB566] tabular-nums block">
                1,200+
              </span>
              <span className="text-xs text-slate-300 font-medium uppercase tracking-wider block">
                {t.stats1Label}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#FFB566] tabular-nums block">
                99.8%
              </span>
              <span className="text-xs text-slate-300 font-medium uppercase tracking-wider block">
                {t.stats2Label}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#FFB566] tabular-nums block">
                5.0 ★
              </span>
              <span className="text-xs text-slate-300 font-medium uppercase tracking-wider block">
                {t.stats3Label}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#FFB566] tabular-nums block">
                3 Hubs
              </span>
              <span className="text-xs text-slate-300 font-medium uppercase tracking-wider block">
                {t.stats4Label} (CA · US · MX)
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 4. INNOVATIVE INTERACTIVE SERVICE SHOWCASE (WITH REAL PHOTOS) */}
      <section id="services" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
              {t.showcaseOverline}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {t.showcaseTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t.showcaseSubtitle}
            </p>
          </div>

          {/* Interactive Category Selector Tabs */}
          <div className="flex items-center justify-center flex-wrap gap-2">
            {[
              { id: 'deepclean', label: t.tabDeepclean },
              { id: 'residential', label: t.tabResidential },
              { id: 'airbnb', label: t.tabAirbnb },
              { id: 'commercial', label: t.tabCommercial },
              { id: 'moveinout', label: t.tabMoveinout },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveServiceTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeServiceTab === tab.id
                    ? 'bg-[#0B1D4A] text-[#FFB566] shadow-sm scale-[1.02]'
                    : 'bg-[#FBF9F5] text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic Active Showcase Card with Real Photographs */}
          <div className="bg-[#FBF9F5] rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left: Real Photography Showcase */}
              <div
                className="lg:col-span-7 rounded-2xl overflow-hidden shadow-md border border-slate-300/80 bg-white relative group cursor-pointer"
                onClick={() => setLightboxImage({
                  src: currentShowcase.imageSrc,
                  fallbackSrc: currentShowcase.fallbackSrc,
                  alt: currentShowcase.imageAlt,
                  title: currentShowcase.title,
                })}
              >
                <img
                  key={currentShowcase.id}
                  src={currentShowcase.imageSrc}
                  alt={currentShowcase.imageAlt}
                  className="w-full h-72 sm:h-96 object-cover transition-transform duration-500 group-hover:scale-102"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = currentShowcase.fallbackSrc || '/images/airbnb_turnover.jpg';
                  }}
                />
                <div className="absolute top-4 left-4 bg-[#0B1D4A]/90 backdrop-blur-md text-[#FFB566] text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>WhiteGlove Certified Standard</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Click to inspect in HD' : 'Clic para ampliar en HD'}</span>
                </div>
              </div>

              {/* Right: Key Deliverables & Immediate Booking */}
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#E89A45] block">
                    WhiteGlove Certified
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1D4A] mt-1">
                    {currentShowcase.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
                    {currentShowcase.tagline}
                  </p>
                </div>

                {/* Bulleted High-Impact Outcomes */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  {currentShowcase.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="font-medium leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                  <strong className="text-slate-900 font-semibold block mb-0.5">
                    {t.recommendedFor}
                  </strong>
                  <span>{currentShowcase.idealFor}</span>
                </div>

                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi WhiteGlove! I would like to book ${currentShowcase.title}. Please provide rates and available slots.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>{t.bookServiceWhatsapp}</span>
                </a>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 5. INSTANT INTERACTIVE ESTIMATOR */}
      <section id="calculator" className="py-20 bg-[#FBF9F5] border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
              {t.calculatorOverline}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {t.calculatorTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t.calculatorSubtitle}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
            
            {/* Currency & Hub Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1D4A] block">
                  {lang === 'en' ? 'Select Currency & Operational Hub' : 'Selecciona Moneda y Sede de Cotización'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {lang === 'en'
                    ? 'Switch between Canadian Dollars, US Dollars, or Mexican Pesos'
                    : 'Cambia entre Dólares Canadienses (CAD), Dólares Americanos (USD) o Pesos Mexicanos (MXN)'}
                </span>
              </div>

              <div className="inline-flex items-center bg-[#FBF9F5] p-1 rounded-xl border border-slate-200 gap-1 self-start sm:self-auto">
                {[
                  { id: 'CAD', label: '🇨🇦 CAD $ (Toronto / GTA)', cityDefault: 'Toronto & GTA' },
                  { id: 'USD', label: '🇺🇸 USD $ (Seattle)', cityDefault: 'Seattle' },
                  { id: 'MXN', label: '🇲🇽 MXN $ (Guadalajara)', cityDefault: 'Guadalajara' },
                ].map((cOpt) => (
                  <button
                    key={cOpt.id}
                    type="button"
                    onClick={() => {
                      setCurrency(cOpt.id);
                      setFormCity(cOpt.cityDefault);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currency === cOpt.id
                        ? 'bg-[#0B1D4A] text-[#FFB566] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Property Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {t.propTypeLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'residence', label: t.optResidence },
                  { id: 'condo', label: t.optCondo },
                  { id: 'airbnb', label: t.optAirbnb },
                  { id: 'office', label: t.optOffice },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCalcProperty(item.id)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      calcProperty === item.id
                        ? 'border-[#0B1D4A] bg-[#0B1D4A] text-white shadow-sm'
                        : 'border-slate-200 bg-[#FBF9F5] text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Size / Bedrooms */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {t.bedroomsLabel}
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { val: '1', label: t.bed1 },
                  { val: '2', label: t.bed2 },
                  { val: '3', label: t.bed3 },
                  { val: '4+', label: t.bed4 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setCalcBedrooms(item.val)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      calcBedrooms === item.val
                        ? 'border-[#0B1D4A] bg-[#0B1D4A] text-white shadow-sm'
                        : 'border-slate-200 bg-[#FBF9F5] text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Bathrooms */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {t.bathroomsLabel}
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { val: '1', label: t.bath1 },
                  { val: '2', label: t.bath2 },
                  { val: '3', label: t.bath3 },
                  { val: '4+', label: t.bath4 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setCalcBathrooms(item.val)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      calcBathrooms === item.val
                        ? 'border-[#0B1D4A] bg-[#0B1D4A] text-white shadow-sm'
                        : 'border-slate-200 bg-[#FBF9F5] text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Scope */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {t.serviceTypeLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'deepclean', label: t.scopeDeep },
                  { id: 'housekeeping', label: t.scopeHousekeeping },
                  { id: 'turnover', label: t.scopeTurnover },
                  { id: 'moveinout', label: t.scopeMoveinout },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCalcType(item.id)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      calcType === item.id
                        ? 'border-[#0B1D4A] bg-[#0B1D4A] text-white shadow-sm'
                        : 'border-slate-200 bg-[#FBF9F5] text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 5: Property Address to anticipate distance */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E89A45]" />
                <span>{t.calcAddressLabel}</span>
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder={t.formAddressPlaceholder}
                className="w-full px-4 py-3 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A]"
              />
            </div>

            {/* Summary & WhatsApp Dispatch */}
            <div className="pt-4 border-t border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#FBF9F5] p-5 rounded-2xl">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  {t.selectedScopeLabel}
                </span>
                <span className="font-serif font-bold text-base text-[#0B1D4A] block">
                  {calcProperty === 'residence' ? (lang === 'en' ? 'Luxury Residence' : 'Residencia Privada') :
                   calcProperty === 'condo' ? (lang === 'en' ? 'Condo / Penthouse' : 'Condominio') :
                   calcProperty === 'airbnb' ? 'Airbnb' :
                   (lang === 'en' ? 'Commercial' : 'Comercial')} · {calcBedrooms} {lang === 'en' ? (calcBedrooms === '1' ? 'Bed' : 'Beds') : (calcBedrooms === '1' ? 'Recámara' : 'Recámaras')} · {calcBathrooms} {lang === 'en' ? (calcBathrooms === '1' ? 'Bath' : 'Baths') : (calcBathrooms === '1' ? 'Baño' : 'Baños')} · {
                     calcType === 'deepclean' ? (lang === 'en' ? 'Deep Clean' : 'Limpieza Profunda') :
                     calcType === 'housekeeping' ? (lang === 'en' ? 'Housekeeping' : 'Housekeeping') :
                     calcType === 'turnover' ? (lang === 'en' ? 'Airbnb Turnover' : 'Turnover Airbnb') :
                     (lang === 'en' ? 'Move-In/Out' : 'Mudanza')
                   }
                </span>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {(() => {
                    const est = getEstimateDetails();
                    return (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B1D4A] bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg tabular-nums shadow-2xs">
                          <span>{lang === 'en' ? `Est. Range: ${est.formattedPrice}` : `Rango Est.: ${est.formattedPrice}`}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1D4A] bg-amber-100/80 border border-amber-300/80 px-2.5 py-1 rounded-lg tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-[#E89A45]" />
                          <span>
                            {lang === 'en'
                              ? `Est. ${est.minH}–${est.maxH} hrs · ${est.crew} Specialists`
                              : `Est. ${est.minH}–${est.maxH} hrs · ${est.crew} Especialistas`}
                          </span>
                        </span>
                      </>
                    );
                  })()}
                  <span className="text-xs text-emerald-700 font-semibold">
                    {t.availableInHubs}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <a
                  href={`https://wa.me/${phone}?text=${getCustomizedQuoteMsg()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>{t.requestCalculatedQuote}</span>
                </a>

                <a
                  href="#quote-form"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-slate-300 hover:border-[#0B1D4A] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-[#0B1D4A]" />
                  <span>{t.fillOnlineFormCta}</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. COMPARISON: THE WHITEGLOVE STANDARD VS REGULAR CLEANERS */}
      <section id="comparison" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
              {t.comparisonOverline}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {t.comparisonTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t.comparisonSub}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-[#0B1D4A] text-white">
                <tr>
                  <th className="p-4 sm:p-5 font-serif text-sm font-semibold">{t.colStandard}</th>
                  <th className="p-4 sm:p-5 font-serif text-sm font-semibold text-[#FFB566] bg-[#061434]">{t.colWhiteGlove}</th>
                  <th className="p-4 sm:p-5 font-serif text-sm font-semibold text-slate-300">{t.colOther}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-[#FBF9F5]">
                {[
                  { feature: t.compRow1Feat, wg: t.compRow1Wg, other: t.compRow1Other },
                  { feature: t.compRow2Feat, wg: t.compRow2Wg, other: t.compRow2Other },
                  { feature: t.compRow3Feat, wg: t.compRow3Wg, other: t.compRow3Other },
                  { feature: t.compRow4Feat, wg: t.compRow4Wg, other: t.compRow4Other },
                  { feature: t.compRow5Feat, wg: t.compRow5Wg, other: t.compRow5Other },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-white transition-colors">
                    <td className="p-4 sm:p-5 font-semibold text-slate-900">{row.feature}</td>
                    <td className="p-4 sm:p-5 font-semibold text-[#0B1D4A] bg-[#FFF8EC]">
                      <span className="flex items-center gap-1.5 text-emerald-800">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                        <span>{row.wg}</span>
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 7. SERVICE AREAS (WITH REAL PHOTOGRAPHS OF CN TOWER, SPACE NEEDLE & GUADALAJARA CATHEDRAL) */}
      <section id="areas" className="py-20 bg-[#FBF9F5] border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
              {t.areasOverline}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {t.areasTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t.areasSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Canada - Real Photo with CN Tower */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="h-48 overflow-hidden relative">
                <img
                  src="/images/toronto_cn_tower.jpg"
                  alt="Toronto Skyline and CN Tower"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#0B1D4A]/90 backdrop-blur-sm text-[#FFB566] text-[10px] font-bold px-2.5 py-1 rounded-full">
                  HQ · Ontario
                </div>
              </div>
              <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-2xl text-[#0B1D4A]">{t.canadaTitle}</h3>
                  <span className="text-xs text-[#E89A45] font-semibold block mt-0.5">{t.canadaHub}</span>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {t.canadaCities}
                  </p>
                </div>

                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(lang === 'en' ? 'Hi WhiteGlove, I am in Toronto/Hamilton and would like to request cleaning service.' : 'Hola WhiteGlove, me encuentro en Toronto/Hamilton y me gustaría solicitar servicio de limpieza.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1D4A] hover:text-[#E89A45] pt-2"
                >
                  <span>{t.canadaBtn}</span>
                </a>
              </div>
            </div>

            {/* United States - Real Photo with Space Needle */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="h-48 overflow-hidden relative">
                <img
                  src="/images/seattle_space_needle.jpg"
                  alt="Seattle Skyline and Space Needle"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#0B1D4A]/90 backdrop-blur-sm text-[#FFB566] text-[10px] font-bold px-2.5 py-1 rounded-full">
                  USA · Washington
                </div>
              </div>
              <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-2xl text-[#0B1D4A]">{t.usaTitle}</h3>
                  <span className="text-xs text-[#E89A45] font-semibold block mt-0.5">{t.usaHub}</span>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {t.usaCities}
                  </p>
                </div>

                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(lang === 'en' ? 'Hi WhiteGlove, I am in Seattle and would like to request cleaning service.' : 'Hola WhiteGlove, me encuentro en Seattle y me interesa cotizar servicio de limpieza.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1D4A] hover:text-[#E89A45] pt-2"
                >
                  <span>{t.usaBtn}</span>
                </a>
              </div>
            </div>

            {/* Mexico - Real Photo with Guadalajara Cathedral */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="h-48 overflow-hidden relative">
                <img
                  src="/images/guadalajara_catedral.jpg"
                  alt="Catedral de Guadalajara"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#0B1D4A]/90 backdrop-blur-sm text-[#FFB566] text-[10px] font-bold px-2.5 py-1 rounded-full">
                  MX · Jalisco
                </div>
              </div>
              <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-2xl text-[#0B1D4A]">{t.mexicoTitle}</h3>
                  <span className="text-xs text-[#E89A45] font-semibold block mt-0.5">{t.mexicoHub}</span>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {t.mexicoCities}
                  </p>
                </div>

                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(lang === 'en' ? 'Hi WhiteGlove, I am in Guadalajara/Zapopan and would like to request cleaning service.' : 'Hola WhiteGlove, me encuentro en Guadalajara/Zapopan y me interesa el servicio de limpieza.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1D4A] hover:text-[#E89A45] pt-2"
                >
                  <span>{t.mexicoBtn}</span>
                </a>
              </div>
            </div>

          </div>

          <p className="text-center text-xs italic text-slate-400">
            {t.areasDisclaimer}
          </p>
        </div>
      </section>

      {/* 8. CLIENT REVIEWS / TESTIMONIALS (Newest First + Interactive Review Submission + Admin Time Ago Editor) */}
      <section id="reviews" className="py-20 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
                {t.reviewsOverline}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
                {t.reviewsTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {lang === 'en'
                  ? 'Sorted from newest to oldest · Share your experience with WhiteGlove.'
                  : 'Ordenados de los más nuevos primero · Comparte tu experiencia con WhiteGlove.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Average Rating Summary Badge */}
              <div className="flex items-center gap-2.5 bg-[#FBF9F5] px-4 py-2.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-0.5 text-[#E89A45]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold text-[#0B1D4A]">
                  {(
                    reviewsList.reduce((acc, r) => acc + (Number(r.stars) || 5), 0) /
                    Math.max(1, reviewsList.length)
                  ).toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">
                  ({reviewsList.length} {lang === 'en' ? 'reviews' : 'reseñas'})
                </span>
              </div>

              {/* Leave a Review CTA Button */}
              <button
                type="button"
                onClick={() => setIsLeaveReviewOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0B1D4A] hover:bg-[#162d6b] text-[#FFB566] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isLeaveReviewOpen
                    ? lang === 'en'
                      ? 'Close Form'
                      : 'Cerrar Formulario'
                    : lang === 'en'
                    ? 'Leave a Review'
                    : 'Dejar un Review'}
                </span>
              </button>
            </div>
          </div>

          {/* Admin Mode Banner if Admin is logged in */}
          {isAdminUser && (
            <div className="bg-[#0B1D4A] text-white px-5 py-3.5 rounded-2xl border border-[#FFB566]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p className="text-xs font-medium text-slate-200">
                  <strong className="text-[#FFB566] font-bold">Modo Administrador Activo:</strong>{' '}
                  Haz clic en <span className="underline decoration-[#FFB566]">Editar Publicación / Tiempo</span> en cualquier reseña para cambiar hace cuánto fue publicada, sus estrellas o su texto.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#FFB566] shrink-0">
                Sincronizado en tiempo real
              </span>
            </div>
          )}

          {/* Success Banner when a client submits a review */}
          {newReviewSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-3.5 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {lang === 'en'
                    ? 'Thank you! Your review has been published and appears first below.'
                    : '¡Gracias por tu confianza! Tu reseña ha sido publicada y aparece de primera en la lista.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNewReviewSuccess(false)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Interactive Leave a Review Form for Clients */}
          {isLeaveReviewOpen && (
            <form
              onSubmit={handleSubmitClientReview}
              className="bg-[#FBF9F5] p-6 sm:p-8 rounded-3xl border-2 border-[#FFB566]/50 shadow-md space-y-5 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#0B1D4A]">
                    {lang === 'en' ? 'Share Your Experience' : 'Deja tu Review sobre WhiteGlove'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'en'
                      ? 'Your review will be published immediately at the top of our client wall.'
                      : 'Tu reseña se publicará al instante apareciendo primero en la página.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLeaveReviewOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {newReviewError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newReviewError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0B1D4A] uppercase tracking-wider mb-1.5">
                    {lang === 'en' ? 'Your Name *' : 'Tu Nombre *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Sofía M.' : 'Ej. Sofía M.'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-[#0B1D4A] focus:outline-none focus:border-[#0B1D4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1D4A] uppercase tracking-wider mb-1.5">
                    {lang === 'en' ? 'City or Service Type' : 'Ciudad o Tipo de Servicio'}
                  </label>
                  <input
                    type="text"
                    value={newReviewLocation}
                    onChange={(e) => setNewReviewLocation(e.target.value)}
                    placeholder={
                      lang === 'en'
                        ? 'e.g. Toronto · Luxury Residence'
                        : 'Ej. Residencia Privada · Limpieza Profunda'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-[#0B1D4A] focus:outline-none focus:border-[#0B1D4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1D4A] uppercase tracking-wider mb-1.5">
                    {lang === 'en' ? 'Star Rating *' : 'Calificación por Estrellas *'}
                  </label>
                  <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const active = (newReviewHoverStars || newReviewStars) >= starVal;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onMouseEnter={() => setNewReviewHoverStars(starVal)}
                          onMouseLeave={() => setNewReviewHoverStars(0)}
                          onClick={() => setNewReviewStars(starVal)}
                          className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
                          title={`${starVal} ★`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              active
                                ? 'text-[#E89A45] fill-[#E89A45]'
                                : 'text-slate-300 fill-slate-100'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 text-xs font-bold text-[#0B1D4A]">
                      {newReviewStars} / 5 ★
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B1D4A] uppercase tracking-wider mb-1.5">
                  {lang === 'en' ? 'Your Review *' : 'Tu Comentario / Reseña *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder={
                    lang === 'en'
                      ? 'Tell us how your home or property looked after our visit...'
                      : 'Cuéntanos qué te pareció la atención al detalle y el resultado en tu propiedad...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-[#0B1D4A] focus:outline-none focus:border-[#0B1D4A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveReviewOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Publish Review Now' : 'Publicar Review Ahora'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Reviews Grid (Sorted Newest First) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviewsList.map((review, idx) => {
              const starCount = Math.min(5, Math.max(1, Number(review.stars) || 5));
              const displayReviewText =
                lang === 'en'
                  ? review.reviewEn || review.review || review.reviewEs
                  : review.reviewEs || review.review || review.reviewEn;
              const displayLocation =
                lang === 'en'
                  ? review.locationEn || review.location || review.locationEs
                  : review.locationEs || review.location || review.locationEn;
              const timeAgoLabel = formatReviewTimeAgo(review, lang);
              const isEditingThis = editingReviewId === review.id;

              return (
                <div
                  key={review.id || idx}
                  className="bg-[#FBF9F5] p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 relative group transition-all hover:border-[#FFB566]/70"
                >
                  {isEditingThis ? (
                    /* ADMIN INLINE REVIEW & TIME-PUBLISHED EDITOR */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B1D4A] flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-[#E89A45]" />
                          Editar Review y Tiempo
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Quick Presets for "Hace cuánto fue publicado" */}
                      <div className="bg-white p-3 rounded-2xl border border-amber-200/80 space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0B1D4A]">
                          ⏱️ Configurar hace cuánto fue publicado:
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const preset = ADMIN_TIME_PRESETS.find((p) => p.id === e.target.value);
                            if (preset) handleApplyAdminTimePreset(preset);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-[#FBF9F5] text-xs font-semibold text-[#0B1D4A] focus:outline-none focus:border-[#0B1D4A]"
                        >
                          <option value="">Elegir tiempo rápido (ej. Hace 2 días, Hace 1 mes...)</option>
                          {ADMIN_TIME_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.labelEs} ({p.labelEn})
                            </option>
                          ))}
                        </select>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            O escribe manualmente la leyenda de tiempo (ej. "Hace 4 días"):
                          </label>
                          <input
                            type="text"
                            value={editReviewDraft.customTimeLabel}
                            onChange={(e) =>
                              setEditReviewDraft((prev) => ({
                                ...prev,
                                customTimeLabel: e.target.value,
                              }))
                            }
                            placeholder="Ej. Hace 3 días / Hace 2 semanas (opcional)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-[#0B1D4A] bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Fecha exacta para el orden (más nuevos primero):
                          </label>
                          <input
                            type="datetime-local"
                            value={
                              editReviewDraft.publishedAt
                                ? new Date(
                                    new Date(editReviewDraft.publishedAt).getTime() -
                                      new Date().getTimezoneOffset() * 60000
                                  )
                                    .toISOString()
                                    .slice(0, 16)
                                : ''
                            }
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const iso = new Date(e.target.value).toISOString();
                              setEditReviewDraft((prev) => ({
                                ...prev,
                                publishedAt: iso,
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-[#0B1D4A] bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Nombre Cliente
                          </label>
                          <input
                            type="text"
                            value={editReviewDraft.name}
                            onChange={(e) =>
                              setEditReviewDraft((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-[#0B1D4A] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Estrellas (1-5)
                          </label>
                          <select
                            value={editReviewDraft.stars}
                            onChange={(e) =>
                              setEditReviewDraft((prev) => ({
                                ...prev,
                                stars: Number(e.target.value),
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#0B1D4A] bg-white"
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {n} Estrellas ({'★'.repeat(n)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Ubicación / Servicio
                        </label>
                        <input
                          type="text"
                          value={editReviewDraft.location}
                          onChange={(e) =>
                            setEditReviewDraft((prev) => ({ ...prev, location: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-[#0B1D4A] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Comentario del Review
                        </label>
                        <textarea
                          rows={3}
                          value={editReviewDraft.review}
                          onChange={(e) =>
                            setEditReviewDraft((prev) => ({ ...prev, review: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-[#0B1D4A] bg-white"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(review.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAdminReviewEdit(review.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#0B1D4A] text-[#FFB566] text-[11px] font-bold hover:bg-[#162d6b] cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {/* Top Bar: Stars + Time Ago Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-[#E89A45]">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < starCount
                                    ? 'fill-current text-[#E89A45]'
                                    : 'text-slate-300 fill-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200/70">
                            <Clock className="w-3 h-3 text-[#E89A45]" />
                            <span>{timeAgoLabel}</span>
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                          "{displayReviewText}"
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#0B1D4A] text-[#FFB566] flex items-center justify-center text-xs font-bold shrink-0">
                            {(review.name || 'C')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-sm text-[#0B1D4A] block leading-none truncate">
                              {review.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block truncate">
                              {displayLocation}
                            </span>
                          </div>
                        </div>

                        {/* Admin Edit Button right on the review card */}
                        {isAdminUser && (
                          <button
                            type="button"
                            onClick={() => handleStartEditReview(review)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100/80 hover:bg-[#FFB566] text-[#0B1D4A] text-[10px] font-bold transition-colors shrink-0 cursor-pointer"
                            title="Editar hace cuánto fue publicado o el contenido de este review"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar Publicación</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 8.2 EXECUTIVE FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
      <section id="faq" className="py-20 bg-[#FBF9F5] border-b border-slate-200/80 scroll-mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
              {lang === 'en' ? 'Clarity & Transparency' : 'Claridad y Confianza'}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {lang === 'en' ? 'Frequently Asked Questions' : 'Preguntas Frecuentes'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Clear, practical answers about our equipment, scheduling, property access, and quotes.'
                : 'Respuestas claras y prácticas sobre nuestro equipo, coordinación de citas, accesos y cotizaciones.'}
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: lang === 'en' ? 'All Questions' : 'Todas las Preguntas' },
              { id: 'service', label: lang === 'en' ? 'Equipment & Services' : 'Equipo y Servicios' },
              { id: 'security', label: lang === 'en' ? 'Access & Coordination' : 'Accesos y Coordinación' },
              { id: 'billing', label: lang === 'en' ? 'Quotes & Scheduling' : 'Cotizaciones y Citas' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFaqCategory(cat.id);
                  setOpenFaqIdx(0);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  faqCategory === cat.id
                    ? 'bg-[#0B1D4A] text-[#FFB566] shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Accordion Cards */}
          <div className="space-y-3">
            {[
              {
                category: 'service',
                q: lang === 'en'
                  ? 'Do you bring your own cleaning equipment and products?'
                  : '¿Llevan su propio equipo y productos de limpieza?',
                a: lang === 'en'
                  ? 'Yes, we bring all the necessary equipment and cleaning products whenever needed for your service. If you prefer that we use specific products or tools that you already have at your property for certain surfaces, just let us know and we will gladly adapt.'
                  : 'Sí, llevamos todo el equipo y los productos de limpieza en caso de necesitarlo para tu servicio. Si además prefieres que utilicemos algún producto o artículo específico que ya tengas en tu propiedad para el cuidado de tus superficies, con gusto nos adaptamos.',
              },
              {
                category: 'security',
                q: lang === 'en'
                  ? 'Who will come to clean my property?'
                  : '¿Quién acude a realizar el servicio en mi propiedad?',
                a: lang === 'en'
                  ? 'We work with trusted, trained team members who follow our care and cleanliness guidelines. For recurring services, we aim to keep the same familiar team members assigned to your property whenever scheduling allows.'
                  : 'Trabajamos con personal de confianza y capacitado en nuestros estándares de limpieza y cuidado. En servicios recurrentes, procuramos asignar al personal que ya conoce tu propiedad siempre que la disponibilidad de agenda lo permita.',
              },
              {
                category: 'security',
                q: lang === 'en'
                  ? 'How do you coordinate property access and Airbnb turnovers?'
                  : '¿Cómo se coordina el acceso a la propiedad o los turnos de Airbnb?',
                a: lang === 'en'
                  ? 'We adapt to the access method that is most convenient for you—whether you receive us in person, leave a key in a lockbox, use a smart lock code, or coordinate through reception. For short-term rental hosts, we stay in direct communication via WhatsApp to align with check-in/out times and let you know if supplies are running low.'
                  : 'Nos adaptamos a la forma de acceso que te resulte más cómoda: ya sea que nos recibas personalmente, mediante código digital, caja de llaves (lockbox) o recepción. Para anfitriones de Airbnb, mantenemos comunicación directa por WhatsApp para coordinar horarios y avisarte si notamos algún insumo por agotarse.',
              },
              {
                category: 'service',
                q: lang === 'en'
                  ? 'What is the difference between Regular Cleaning and a Deep Clean?'
                  : '¿Cuál es la diferencia entre una Limpieza Regular y una Limpieza Profunda?',
                a: lang === 'en'
                  ? 'Regular Cleaning covers general maintenance of kitchens, bathrooms, bedrooms, and floors to keep your space fresh and tidy. A Deep Clean allocates additional time for areas with greater buildup and detailed surfaces; if you require specific extra tasks (such as inside ovens, refrigerators, or cabinets), you can mention them when requesting your quote so we include them in your plan.'
                  : 'La Limpieza Regular se enfoca en el mantenimiento general de cocina, baños, recámaras y pisos para conservar tu espacio limpio y en orden. La Limpieza Profunda dedica mayor tiempo a zonas con acumulación y detallado; si requieres áreas especiales (como interior de horno, refrigerador o alacenas), puedes indicarlo al cotizar para contemplarlo en tu servicio.',
              },
              {
                category: 'billing',
                q: lang === 'en'
                  ? 'How does the online estimate work and how is the final price confirmed?'
                  : '¿Cómo funciona el estimador en línea y cómo se confirma el precio final?',
                a: lang === 'en'
                  ? 'The online calculator gives you a helpful initial estimate based on property size and service type. Before scheduling, our team confirms the final scope and rate with you via WhatsApp or email according to the actual condition and needs of your space.'
                  : 'El cotizador de la página te brinda un estimado inicial de referencia según el tamaño de tu propiedad y el tipo de servicio. Antes de agendar, confirmamos contigo por WhatsApp o correo el alcance y costo final de acuerdo con las características reales de tu espacio.',
              },
              {
                category: 'billing',
                q: lang === 'en'
                  ? 'What if I need to reschedule my appointment or share feedback?'
                  : '¿Qué pasa si necesito reprogramar mi cita o comentar algún detalle?',
                a: lang === 'en'
                  ? 'If you need to change your appointment date or time, please message us via WhatsApp in advance so we can find a new slot subject to schedule availability. If you have any feedback or notice a detail from the agreed scope after a visit, let us know on the same day so we can follow up promptly.'
                  : 'Si necesitas cambiar la fecha u horario de tu servicio, avísanos con anticipación por WhatsApp para reprogramarlo de acuerdo con la disponibilidad de agenda. Si al finalizar tienes algún comentario o notas algún detalle dentro de lo acordado, escríbenos el mismo día para darle seguimiento oportuno.',
              },
            ]
              .filter((item) => faqCategory === 'all' || item.category === faqCategory)
              .map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'bg-white border-[#0B1D4A] shadow-md'
                        : 'bg-white/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                      className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="font-serif font-bold text-sm sm:text-base text-[#0B1D4A]">
                        {faq.q}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-transform ${
                          isOpen
                            ? 'bg-[#0B1D4A] text-[#FFB566] rotate-90'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

        </div>
      </section>

      {/* 8.5 ALTERNATIVE ONLINE CONTACT / QUOTE REQUEST FORM (PROPUESTA #1 - LEAD CAPTURE) */}
      <section id="quote-form" className="py-20 bg-white border-b border-slate-200/80 scroll-mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1D4A] text-[#FFB566] text-[10px] font-bold tracking-widest uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB566]" />
              <span>{t.formOverline}</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {t.formTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.formSubtitle}
            </p>
          </div>

          {formSubmittedFolio ? (
            /* Luxury Success Confirmation Card with Official Folio */
            <div className="bg-white rounded-3xl border border-emerald-200/80 p-8 sm:p-10 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#0B1D4A]">
                      {t.formSuccessTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.formSuccessSubtitle}
                    </p>
                  </div>
                </div>

                <div className="bg-[#FAF7F1] border border-amber-200/80 px-4 py-3 rounded-2xl text-center sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {t.formFolioLabel}
                  </span>
                  <span className="font-mono font-bold text-lg text-[#0B1D4A] tracking-wider block">
                    {formSubmittedFolio.folio}
                  </span>
                </div>
              </div>

              {/* Submitted Details Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#FBF9F5] p-5 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente</span>
                  <span className="font-bold text-[#0B1D4A] text-sm block mt-0.5">{formSubmittedFolio.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sede / Dirección</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {formSubmittedFolio.address ? `${formSubmittedFolio.address} (${formSubmittedFolio.city})` : formSubmittedFolio.city}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo & Dimensiones</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {formSubmittedFolio.propertyType} ({formSubmittedFolio.bedrooms}R / {formSubmittedFolio.bathrooms}B)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Servicio Solicitado</span>
                  <span className="font-semibold text-[#0B1D4A] block mt-0.5">{formSubmittedFolio.serviceType}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(
                    lang === 'en'
                      ? `Hi WhiteGlove! I just submitted an online quote request with Folio ${formSubmittedFolio.folio} for my ${formSubmittedFolio.propertyType} at ${formSubmittedFolio.address || formSubmittedFolio.city}.`
                      : `¡Hola WhiteGlove! Acabo de enviar una solicitud de cotización en línea con el Folio ${formSubmittedFolio.folio} para mi ${formSubmittedFolio.propertyType} en ${formSubmittedFolio.address || formSubmittedFolio.city}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>{t.formSendFolioWa}</span>
                </a>

                <button
                  type="button"
                  onClick={() => setFormSubmittedFolio(null)}
                  className="w-full sm:w-auto px-5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {t.formSubmitAnother}
                </button>
              </div>

            </div>
          ) : (
            /* High-Intent Online Form */
            <form
              onSubmit={handleFormSubmit}
              className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xl space-y-6"
            >
              {formError && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Name, Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.formNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Eleanor Vance' : 'Ej: Lic. Elena Morales'}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.formEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={lang === 'en' ? 'client@residence.com' : 'contacto@empresa.com'}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.formPhoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder={lang === 'en' ? '+1 (416) 000-0000' : '+52 33 0000 0000'}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A]"
                  />
                </div>
              </div>

              {/* Row 2: Operational Hub, Tentative Date & Preferred Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.formCityLabel}
                  </label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A] cursor-pointer"
                  >
                    <option value="Toronto & GTA">Toronto & GTA (Ontario, CA)</option>
                    <option value="Hamilton">Hamilton (Ontario, CA)</option>
                    <option value="Seattle">Seattle (Washington, US)</option>
                    <option value="Guadalajara">Guadalajara (Jalisco, MX)</option>
                    <option value="Otra Región">Otra Región / Por Confirmar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.formDateLabel}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.formPrefContact}
                  </label>
                  <select
                    value={formContactPref}
                    onChange={(e) => setFormContactPref(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A] cursor-pointer"
                  >
                    <option value="whatsapp">{t.formPrefWhatsapp}</option>
                    <option value="email">{t.formPrefEmail}</option>
                    <option value="phone">{t.formPrefPhone}</option>
                  </select>
                </div>
              </div>

              {/* Row 2.5: Property Address (Required to anticipate travel distance) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E89A45]" />
                  <span>{t.formAddressLabel}</span>
                </label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder={t.formAddressPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A]"
                />
              </div>

              {/* Property Scope Synchronization Indicator */}
              <div className="bg-[#FAF7F1] border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {lang === 'en' ? 'Configured from Estimator' : 'Configuración de Propiedad (Sincronizada del Estimador)'}
                  </span>
                  <span className="font-serif font-bold text-sm text-[#0B1D4A] block mt-0.5">
                    {calcProperty === 'residence' ? (lang === 'en' ? 'Luxury Residence' : 'Residencia Privada') :
                     calcProperty === 'condo' ? (lang === 'en' ? 'Condo / Penthouse' : 'Condominio') :
                     calcProperty === 'airbnb' ? 'Airbnb' :
                     (lang === 'en' ? 'Commercial' : 'Oficina / Comercial')} · {calcBedrooms} {lang === 'en' ? (calcBedrooms === '1' ? 'Bed' : 'Beds') : (calcBedrooms === '1' ? 'Recámara' : 'Recámaras')} · {calcBathrooms} {lang === 'en' ? (calcBathrooms === '1' ? 'Bath' : 'Baths') : (calcBathrooms === '1' ? 'Baño' : 'Baños')} · {
                       calcType === 'deepclean' ? (lang === 'en' ? 'Deep Clean' : 'Limpieza Profunda') :
                       calcType === 'housekeeping' ? (lang === 'en' ? 'Housekeeping' : 'Housekeeping') :
                       calcType === 'turnover' ? (lang === 'en' ? 'Airbnb Turnover' : 'Turnover Airbnb') :
                       (lang === 'en' ? 'Move-In/Out' : 'Mudanza')
                     }
                  </span>
                </div>

                <a
                  href="#calculator"
                  className="text-[11px] font-bold text-[#E89A45] hover:text-[#0B1D4A] underline transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                  {lang === 'en' ? 'Change in Calculator ↑' : 'Modificar en el Estimador ↑'}
                </a>
              </div>

              {/* Row 3: Special Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {t.formNotesLabel}
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={t.formNotesPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1D4A]/20 focus:border-[#0B1D4A] resize-none"
                />
              </div>

              {/* Submit Button & Privacy Note */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'en' ? 'Your property details are kept strictly confidential.' : 'Tus datos son confidenciales y están protegidos.'}</span>
                </span>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#0B1D4A] hover:bg-[#1E3670] text-[#FFB566] font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFB566]" />
                      <span>{t.formSubmittingText}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#FFB566]" />
                      <span>{t.formSubmitBtn}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </section>

      {/* 9. HIGH-CONVERSION SALES CTA SECTION */}
      <section id="contact" className="py-20 bg-gradient-to-br from-[#061434] via-[#0B1D4A] to-[#1E3670] text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          <img
            src="/logo.webp"
            alt="WhiteGlove"
            className="w-16 h-16 mx-auto rounded-full ring-2 ring-[#FFB566]/60 shadow-xl"
          />

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#FAF7F1] leading-tight">
            {t.ctaTitle}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t.ctaSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={`https://wa.me/${phone}?text=${encodeURIComponent(lang === 'en' ? 'Hi WhiteGlove Operations! I want to request a free quote for my property.' : '¡Hola equipo de WhiteGlove! Quiero solicitar una cotización gratuita para mi propiedad.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-sm rounded-xl shadow-xl transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-current text-[#0B1D4A]" />
              <span>{t.ctaButton}</span>
            </a>

            <a
              href="https://instagram.com/whitegloveps"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all active:scale-[0.98]"
            >
              <Instagram className="w-4 h-4 text-[#FFB566]" />
              <span>{t.instagramFollow}</span>
            </a>
          </div>

          <p className="text-xs text-slate-400 italic pt-2">
            {t.servingCountries}
          </p>
        </div>
      </section>

      {/* 10. LUXURY FOOTER */}
      <footer className="py-12 bg-[#061434] text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
            {/* Logo on cream card */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F9F5EB] rounded-2xl p-1 shadow-md flex items-center justify-center">
                <img src="/logo.webp" alt="WhiteGlove" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <span className="font-serif text-white font-bold text-base block">WhiteGlove Professional Services</span>
                <span className="text-[#FFB566] italic text-xs block">{t.tagline}</span>
              </div>
            </div>

            {/* Service areas */}
            <div className="text-left md:text-right space-y-1 text-slate-400 text-xs">
              <p><strong className="text-slate-200">Canada:</strong> Toronto & GTA · Hamilton</p>
              <p><strong className="text-slate-200">USA:</strong> Seattle, Washington</p>
              <p><strong className="text-slate-200">Mexico:</strong> Guadalajara, Jalisco</p>
            </div>
          </div>

          {/* Services line */}
          <div className="text-slate-500 text-center text-xs">
            Residential · Airbnb · Deep Cleaning · Move-In/Out · Commercial · Retail · Housekeeping
          </div>

          {/* Bottom copyright & Portal link */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900 text-[11px] text-slate-500">
            <span>{t.copyrightText}</span>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com/whitegloveps" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
                Instagram @whitegloveps
              </a>
              <span>·</span>
              <button onClick={onGoToLogin} className="hover:text-white font-medium">
                {t.portalLogin}
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* FULLSCREEN HD LUXURY INTERIOR LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Bar with Title and Close */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#FFB566] font-bold block">
                WhiteGlove High-Resolution Portfolio
              </span>
              <h4 className="font-serif text-lg sm:text-xl font-bold text-white">
                {lightboxImage.title || lightboxImage.alt}
              </h4>
            </div>

            <button
              onClick={() => setLightboxImage(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* High Res Image Container */}
          <div
            className="w-full max-w-5xl max-h-[82vh] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="w-full h-auto max-h-[80vh] object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                if (lightboxImage.fallbackSrc) {
                  e.currentTarget.src = lightboxImage.fallbackSrc;
                }
              }}
            />
          </div>

          <div className="pt-3 text-center text-xs text-slate-400">
            <span>{lang === 'en' ? 'Click anywhere outside or press Esc to close' : 'Haz clic fuera de la imagen o presiona Esc para cerrar'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
