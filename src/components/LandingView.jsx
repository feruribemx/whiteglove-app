import React, { useState } from 'react';
import {
  Sparkles, Shield, Clock, CheckCircle2, MessageCircle, ArrowRight,
  Star, Globe, Instagram, Building2, Home, RefreshCw, Layers,
  ShoppingBag, MapPin, ChevronRight, BadgeCheck, Check, Phone,
  Eye, X
} from 'lucide-react';

export default function LandingView({ onGoToLogin }) {
  // Default language is English; when toggled to Spanish, 100% of the page switches to Spanish
  const [lang, setLang] = useState('en');

  // Lightbox Modal for HD Luxury Interior Inspection
  const [lightboxImage, setLightboxImage] = useState(null);

  // Interactive Service Showcase Tab (Prioritizing Deep Clean & Luxury Housekeeping)
  const [activeServiceTab, setActiveServiceTab] = useState('deepclean');

  // Interactive Quote Calculator State (Luxury Residence & Deep Clean first; includes bathrooms)
  const [calcProperty, setCalcProperty] = useState('residence');
  const [calcBedrooms, setCalcBedrooms] = useState('3');
  const [calcBathrooms, setCalcBathrooms] = useState('2');
  const [calcType, setCalcType] = useState('deepclean');

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

    if (lang === 'en') {
      return encodeURIComponent(
        `Hi WhiteGlove! I would like to request an estimate for a ${propertyText} with ${calcBedrooms} bedroom(s) and ${calcBathrooms} bathroom(s) (${serviceText}).`
      );
    }
    return encodeURIComponent(
      `¡Hola WhiteGlove! Me gustaría solicitar una cotización para ${propertyText} de ${calcBedrooms} recámara(s) y ${calcBathrooms} baño(s) (${serviceText}).`
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
      heroHeadline: 'Exceptional Spaces. Zero Compromise.',
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
      compRow1Feat: 'Inspection & Verification',
      compRow1Wg: '50-Point Digital Checklist + Photo Sign-off',
      compRow1Other: 'Unverified / No documentation',
      compRow2Feat: 'Chemicals & Materials',
      compRow2Wg: 'Stone-safe, eco-friendly, zero synthetic fumes',
      compRow2Other: 'Harsh abrasive bleach and generic store chemicals',
      compRow3Feat: 'Short-Term Rental Linen Care',
      compRow3Wg: '5-Star hotel hospital tucks, inventory logs & restock',
      compRow3Other: 'Basic bedding changes without restocking',
      compRow4Feat: 'Specialist Standards & Trust',
      compRow4Wg: '100% Background-checked, uniformed & vetted specialists',
      compRow4Other: 'Unscreened casual gig workers',
      compRow5Feat: 'Reliability Guarantee',
      compRow5Wg: 'Immediate 24-hour complimentary re-touch',
      compRow5Other: 'No re-touch policy / Slow resolution',
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
      copyrightText: '© 2026 WhiteGlove Professional Services. All Rights Reserved.',
      navAbout: 'About',
      navServices: 'Services',
      navEstimate: 'Estimate',
      navStandard: 'Standard',
      navAreas: 'Locations',
      navReviews: 'Reviews',
      navContact: 'Contact',
    },
    es: {
      tagline: 'Limpieza profesional. Cuidado excepcional.',
      portalLogin: 'Acceso al Portal',
      heroTag: 'EL ESTÁNDAR SUPREMO EN CUIDADO RESIDENCIAL',
      heroHeadline: 'Espacios excepcionales. Cero compromisos.',
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
      compRow1Feat: 'Inspección y Verificación',
      compRow1Wg: 'Checklist digital de 50 puntos + reporte fotográfico',
      compRow1Other: 'Sin verificación ni evidencias fotográficas',
      compRow2Feat: 'Químicos y Materiales',
      compRow2Wg: 'pH neutro, seguros para mármol y mascotas',
      compRow2Other: 'Cloro agresivo y limpiadores genéricos abrasivos',
      compRow3Feat: 'Manejo de Blancos en Airbnb',
      compRow3Wg: 'Tendido de hotel 5 estrellas y control de stock',
      compRow3Other: 'Cambio básico sin control de insumos',
      compRow4Feat: 'Seguridad del Personal',
      compRow4Wg: '100% Verificados con antecedentes y uniformados',
      compRow4Other: 'Trabajadores rotativos no certificados',
      compRow5Feat: 'Garantía de Satisfacción',
      compRow5Wg: 'Retoque gratuito inmediato dentro de 24 horas',
      compRow5Other: 'Sin garantía ni respuesta ágil',
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
      copyrightText: '© 2026 WhiteGlove Professional Services. Todos los Derechos Reservados.',
      navAbout: 'Nosotros',
      navServices: 'Servicios',
      navEstimate: 'Cotizar',
      navStandard: 'Estándar',
      navAreas: 'Sedes',
      navReviews: 'Testimonios',
      navContact: 'Contacto',
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

  // Real Testimonials Data
  const testimonials = [
    {
      name: 'Alexei',
      location: lang === 'en' ? 'Toronto, ON · Airbnb Host' : 'Toronto, ON · Anfitrión Airbnb',
      review: lang === 'en'
        ? 'WhiteGlove transformed my Airbnb turnovers. My guests consistently mention how spotless the space feels. The attention to detail is unmatched.'
        : 'WhiteGlove transformó mis turnovers de Airbnb. Mis huéspedes constantemente mencionan lo impecable que se siente el espacio. La atención al detalle es inigualable.',
    },
    {
      name: 'Mandy D.',
      location: lang === 'en' ? 'Markham, ON · Luxury Homeowner' : 'Markham, ON · Residencia Privada',
      review: lang === 'en'
        ? 'Reliable, professional, and detail-oriented. I never worry about my property between bookings — WhiteGlove has it covered.'
        : 'Confiables, profesionales y meticulosos. Nunca me preocupo por mi propiedad entre reservas — WhiteGlove lo tiene todo bajo control.',
    },
    {
      name: 'Rohan',
      location: lang === 'en' ? 'Downtown Toronto · 3 Properties' : 'Downtown Toronto · 3 Propiedades',
      review: lang === 'en'
        ? 'The team manages all three of my units with incredible consistency. Communication is clear, service is impeccable.'
        : 'El equipo maneja mis tres unidades con una consistencia increíble. La comunicación es clara y el servicio impecable.',
    },
    {
      name: 'Saadman',
      location: lang === 'en' ? 'Mississauga, ON · Estate Owner' : 'Mississauga, ON · Propietario',
      review: lang === 'en'
        ? 'Deep clean service was outstanding. Found that premium touch other companies promise but never deliver.'
        : 'El servicio de limpieza profunda fue excepcional. Encontré ese toque premium que otras compañías prometen pero nunca entregan.',
    },
    {
      name: 'Max',
      location: lang === 'en' ? 'Hamilton, ON · Property Manager' : 'Hamilton, ON · Property Manager',
      review: lang === 'en'
        ? 'Been working with WhiteGlove for months. Their checklists and property reports make managing from a distance effortless.'
        : 'He trabajado con WhiteGlove por meses. Sus checklists y reportes de propiedad hacen que administrar a distancia sea sencillo.',
    },
    {
      name: 'Larisse',
      location: lang === 'en' ? 'Yorkville, Toronto · Penthouse' : 'Yorkville, Toronto · Penthouse',
      review: lang === 'en'
        ? 'Michelle and her team are incredible. They treat my home like it was their own. Highly recommend.'
        : 'Michelle y su equipo son increíbles. Tratan mi casa como si fuera suya. Altamente recomendados.',
    },
  ];

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
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#services" className="hover:text-white transition-colors">{t.navServices}</a>
            <a href="#calculator" className="hover:text-white transition-colors">{t.navEstimate}</a>
            <a href="#comparison" className="hover:text-white transition-colors">{t.navStandard}</a>
            <a href="#areas" className="hover:text-white transition-colors">{t.navAreas}</a>
            <a href="#reviews" className="hover:text-white transition-colors">{t.navReviews}</a>
            <a href="#contact" className="hover:text-white transition-colors">{t.navContact}</a>
          </nav>

          {/* Action Zone: Language toggle + Portal Login button */}
          <div className="flex items-center gap-3 shrink-0">
            
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

            {/* Summary & WhatsApp Dispatch */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FBF9F5] p-5 rounded-2xl">
              <div>
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
                <span className="text-xs text-emerald-700 font-semibold mt-0.5 block">
                  {t.availableInHubs}
                </span>
              </div>

              <a
                href={`https://wa.me/${phone}?text=${getCustomizedQuoteMsg()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FFB566] hover:bg-[#E89A45] text-[#0B1D4A] font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>{t.requestCalculatedQuote}</span>
              </a>
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

      {/* 8. CLIENT REVIEWS / TESTIMONIALS */}
      <section id="reviews" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E89A45] block">
              {t.reviewsOverline}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#0B1D4A]">
              {t.reviewsTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((review, idx) => (
              <div
                key={idx}
                className="bg-[#FBF9F5] p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#E89A45]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                    "{review.review}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60">
                  <div className="w-8 h-8 rounded-full bg-[#0B1D4A] text-[#FFB566] flex items-center justify-center text-xs font-bold">
                    {review.name[0]}
                  </div>
                  <div>
                    <span className="font-serif font-bold text-sm text-[#0B1D4A] block leading-none">
                      {review.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                      {review.location}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
