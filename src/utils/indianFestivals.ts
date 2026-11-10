import { IndianFestival, FestivalAlert, FestivalUrgency } from '../types';

export const MAJOR_INDIAN_FESTIVALS: IndianFestival[] = [
  {
    id: 'diwali',
    name: 'Diwali (Deepavali)',
    nameHindi: 'दीपावली / दिवाली',
    category: 'Major Festival',
    emoji: '🪔',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-10-20',
      2026: '2026-11-08',
      2027: '2027-10-29',
      2028: '2028-10-17',
      2029: '2029-11-05',
    },
    description: 'The Festival of Lights. India\'s biggest shopping extravaganza with peak demand for festive ethnic wear, gold embroidery, and gifting.',
    ethnicRelevance: 'Highest demand for luxury Chikankari sets, Anarkalis, Shararas, and gifting boxes across India.',
    shoppingImpact: 'Critical Peak',
    recommendedActions: [
      'Activate Diwali Dhamaka Festive Banner & 15-20% discount code',
      'Stock up ready-to-ship ethnic festive kurtis and 3-piece sets',
      'Coordinate with Delhivery for priority pickup before holiday transit freeze',
      'Send VIP WhatsApp early-access catalog to existing customers',
    ],
    suggestedAnnouncement: '✨ DIWALI SPECIAL: FLAT 15% OFF ON FESTIVE ETHNIC SUITS | CODE: DIWALI15 | FREE EXPEDITED DELIVERY',
    suggestedCoupon: 'DIWALI15',
  },
  {
    id: 'dhanteras',
    name: 'Dhanteras',
    nameHindi: 'धनतेरस',
    category: 'Religious',
    emoji: '🪙',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-10-18',
      2026: '2026-11-06',
      2027: '2027-10-27',
      2028: '2028-10-15',
      2029: '2029-11-03',
    },
    description: 'Auspicious day marking the start of Diwali. High customer spending on traditional outfits, yellow/golden hues, and luxury apparel.',
    ethnicRelevance: 'Customers prefer yellow, mustard, and gold Zari work kurtis and festive silks.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Showcase Yellow & Golden ethnic collection on Homepage',
      'Offer "Auspicious Dhanteras Gifting" packaging add-on',
      'Ensure next-day dispatch for local & NCR deliveries',
    ],
    suggestedAnnouncement: '🪙 SHUBH DHANTERAS SALE: EXTRA 10% OFF ON GOLD & YELLOW ETHNIC STYLES | CODE: DHANTERAS10',
    suggestedCoupon: 'DHANTERAS10',
  },
  {
    id: 'bhai-dooj',
    name: 'Bhai Dooj',
    nameHindi: 'भाई दूज',
    category: 'Major Festival',
    emoji: '🎁',
    colorTheme: 'rose',
    datesByYear: {
      2025: '2025-10-22',
      2026: '2026-11-10',
      2027: '2027-10-31',
      2028: '2028-10-19',
      2029: '2029-11-07',
    },
    description: 'Celebrates brother-sister bond following Diwali. Massive last-minute gift shopping for sisters.',
    ethnicRelevance: 'Popular gifting options: Premium Chikankari kurtis, pastel sets, and festive dupattas.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Promote express courier shipping for gift orders',
      'Run "Gift Your Sister" WhatsApp curated broadcast',
      'Offer complimentary gift wrap & personalized message cards',
    ],
    suggestedAnnouncement: '🎁 BHAI DOOJ SPECIAL: GIFT YOUR SISTER REDMODE HANDCRAFTED KURTIS | CODE: BHAIDOoj',
    suggestedCoupon: 'BHAIDOoj',
  },
  {
    id: 'karwa-chauth',
    name: 'Karwa Chauth',
    nameHindi: 'करवा चौथ',
    category: 'Major Festival',
    emoji: '🌙',
    colorTheme: 'rose',
    datesByYear: {
      2025: '2025-10-10',
      2026: '2026-10-29',
      2027: '2027-10-19',
      2028: '2028-10-07',
      2029: '2029-10-27',
    },
    description: 'Traditional fasting and celebration for married women. Enormous surge in red, maroon, and bridal ethnic wear.',
    ethnicRelevance: 'Peak sales for Red, Crimson, Maroon, and Pink heavy Chikankari kurtis, Anarkalis, and gota-patti sets.',
    shoppingImpact: 'Critical Peak',
    recommendedActions: [
      'Highlight "The Red & Maroon Edit" prominently on homepage banner',
      'Emphasize guaranteed delivery within 3-4 business days',
      'Highlight bridal Chikankari craftsmanship and ready-to-wear sizes (M to XXL)',
    ],
    suggestedAnnouncement: '🌙 KARWA CHAUTH SPECIAL: EXCLUSIVE RED & MAROON ETHNIC WEAR | READY TO SHIP IN 24H',
    suggestedCoupon: 'SUHAAG10',
  },
  {
    id: 'kanagat',
    name: 'Kanagat (Pitru Paksha / Shradh)',
    nameHindi: 'कनागत / पितृ पक्ष श्राद्ध',
    category: 'Religious',
    emoji: '🙏',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-09-07',
      2026: '2026-09-25',
      2027: '2027-09-15',
      2028: '2028-09-04',
      2029: '2029-09-23',
    },
    description: '16-day sacred ancestral period. Retail clothing buying typically cools down; optimal window for warehouse stock staging, packaging prep, and finalizing festive catalogs before the massive Navratri rush.',
    ethnicRelevance: 'Buying cools down briefly. Focus on inventory readiness, steaming, barcode tags, and photo assets for Navratri.',
    shoppingImpact: 'Special Sale',
    recommendedActions: [
      'Stage ready-to-ship festive stock before Navratri & Diwali wave',
      'Organize packaging boxes, tamper-proof bags, and thank-you cards',
      'Shoot and upload new festive catalog collections',
      'Lock in Delhivery pickup slots before seasonal carrier capacity crunches',
    ],
    suggestedAnnouncement: '✨ FESTIVE SNEAK PEEK: GET READY FOR NAVRATRI & DIWALI | NEW CHIKANKARI ARRIVALS PREVIEW',
    suggestedCoupon: 'PREVIEW10',
  },
  {
    id: 'navratri',
    name: 'Sharad Navratri (9 Nights of Garba)',
    nameHindi: 'शारदीय नवरात्रि',
    category: 'Major Festival',
    emoji: '💃',
    colorTheme: 'orange',
    datesByYear: {
      2025: '2025-09-22',
      2026: '2026-10-11',
      2027: '2027-09-30',
      2028: '2028-09-19',
      2029: '2029-10-08',
    },
    description: 'Nine-night festival celebrating Goddess Durga with Garba and Dandiya dance events. Daily color themes drive multi-outfit buying.',
    ethnicRelevance: 'Huge demand for 9 daily colors, flared Anarkalis, breathable cotton kurtas, and mirror-work Chikankari.',
    shoppingImpact: 'Critical Peak',
    recommendedActions: [
      'Launch "9 Days 9 Colors of Navratri" curated category filter',
      'Run multi-buy bundle offer (e.g. Buy 3 Kurtis, Get Extra 12% OFF)',
      'Inspect ready stock in sizes S, M, L, XL for instant dispatches',
    ],
    suggestedAnnouncement: '💃 NAVRATRI UTSAV: CELEBRATE 9 DAYS IN AUTHENTIC ETHNIC PRINTS | BUY 2 GET 10% OFF',
    suggestedCoupon: 'NAVRATRI10',
  },
  {
    id: 'dussehra',
    name: 'Dussehra (Vijayadashami)',
    nameHindi: 'दशहरा / विजयादशमी',
    category: 'Major Festival',
    emoji: '🏹',
    colorTheme: 'red',
    datesByYear: {
      2025: '2025-10-02',
      2026: '2026-10-20',
      2027: '2027-10-09',
      2028: '2028-09-28',
      2029: '2029-10-17',
    },
    description: 'Celebrates the victory of good over evil. Official kickoff to the winter festive shopping season in North & East India.',
    ethnicRelevance: 'Celebratory family gatherings require elegant festive kurtas and silk-cotton combinations.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Promote Vijayadashami festive weekend flash deals',
      'Update homepage hero banner with festive typography',
      'Ensure courier pickups are scheduled before regional state holidays',
    ],
    suggestedAnnouncement: '🏹 VIJAYADASHAMI SALE: CELEBRATE THE FESTIVE SPIRIT WITH FLAT 10% OFF | USE CODE: DUSSEHRA10',
    suggestedCoupon: 'DUSSEHRA10',
  },
  {
    id: 'ramzan',
    name: 'Ramzan (Mahe Ramadan Starts)',
    nameHindi: 'माहे रमज़ान (Ramadan Mubarak)',
    category: 'Religious',
    emoji: '🌙',
    colorTheme: 'emerald',
    datesByYear: {
      2025: '2025-03-01',
      2026: '2026-02-18',
      2027: '2027-02-08',
      2028: '2028-01-28',
      2029: '2029-01-16',
    },
    description: 'Holy month of fasting, Iftar, and night prayers. Month-long ethnic wear demand, late-evening online orders, and early wardrobe planning for Eid.',
    ethnicRelevance: 'Strong demand for pure breathable Mulmul Cotton, modest silhouettes, white & pastel Chikankari kurtas.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Promote breathable pure cotton and modest Chikankari kurtis',
      'Run special late-evening Iftar shopping delivery promotions',
      'Stockpile luxury white and pastel sets for the upcoming Eid festival',
      'Schedule courier dispatches efficiently to maintain on-time transit',
    ],
    suggestedAnnouncement: '🌙 RAMZAN MUBARAK SPECIAL: PURE COTTON & CHIKANKARI ETHNIC WEAR | CODE: RAMZAN10',
    suggestedCoupon: 'RAMZAN10',
  },
  {
    id: 'eid-ul-fitr',
    name: 'Eid-ul-Fitr (Meethi Eid)',
    nameHindi: 'ईद-उल-फ़ितर',
    category: 'Major Festival',
    emoji: '🌙',
    colorTheme: 'emerald',
    datesByYear: {
      2025: '2025-03-31',
      2026: '2026-03-20',
      2027: '2027-03-10',
      2028: '2028-02-27',
      2029: '2029-02-15',
    },
    description: 'Culmination of holy month of Ramadan. One of the single largest ethnic wear shopping periods of the year across India and globally.',
    ethnicRelevance: 'Massive surge for White, Pastel Green, Sea Green, and Heavy Chikankari Hand-Embroidered Kurtas, Shararas, and Kurtis.',
    shoppingImpact: 'Critical Peak',
    recommendedActions: [
      'Launch "The Royal Eid Collection" featured banner 10 days in advance',
      'Stock up Pure Mulmul Cotton and Georgette Chikankari sets',
      'Ensure strict 24-48h dispatch timeline so customers receive garments well before Chand Raat',
      'Offer WhatsApp assistance for urgent size matching and quick delivery checks',
    ],
    suggestedAnnouncement: '🌙 EID MUBARAK COLLECTION: HANDCRAFTED CHIKANKARI SUITS & KURTIS | GUARANTEED EID DELIVERY',
    suggestedCoupon: 'EIDMUBARAK',
  },
  {
    id: 'eid-al-adha',
    name: 'Eid al-Adha (Bakrid)',
    nameHindi: 'ईद-उल-अज़हा (बकरीद)',
    category: 'Major Festival',
    emoji: '🕌',
    colorTheme: 'emerald',
    datesByYear: {
      2025: '2025-06-07',
      2026: '2026-05-27',
      2027: '2027-05-17',
      2028: '2028-05-05',
      2029: '2029-04-24',
    },
    description: 'Major Islamic festival celebrated with traditional feasts, gatherings, and new traditional clothing.',
    ethnicRelevance: 'Strong demand for breathable summer pure-cotton Chikankari kurtas and pastel ethnic ensembles.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Promote summer festive ethnic wear with breathable fabrics',
      'Send WhatsApp broadcast to existing ethnic shoppers',
      'Verify pin-code deliverability to avoid transit delays',
    ],
    suggestedAnnouncement: '🕌 BAKRID SPECIAL: CELEBRATE WITH PURE COTTON ETHNIC LUXURY | CODE: BAKRID10',
    suggestedCoupon: 'BAKRID10',
  },
  {
    id: 'holi',
    name: 'Holi (Festival of Colors)',
    nameHindi: 'होली / धूलिवंदन',
    category: 'Major Festival',
    emoji: '🎨',
    colorTheme: 'purple',
    datesByYear: {
      2025: '2025-03-14',
      2026: '2026-03-03',
      2027: '2027-03-22',
      2028: '2028-03-11',
      2029: '2029-03-01',
    },
    description: 'Vibrant spring festival celebrating love and colors. White ethnic wear is the quintessential choice across India.',
    ethnicRelevance: 'Explosive sales for Pristine White & Off-White Chikankari Mulmul Kurtis, paired with colorful dupattas.',
    shoppingImpact: 'Critical Peak',
    recommendedActions: [
      'Promote "The White Chikankari Holi Edit" on hero banner',
      'Stockpile high inventory of pure white mulmul cotton kurtis',
      'Highlight 100% breathable organic cotton suitable for celebrations',
    ],
    suggestedAnnouncement: '🎨 HOLI WHITE EDIT: PURE WHITE CHIKANKARI KURTIS | STARTING ₹999 | SAME-DAY DISPATCH',
    suggestedCoupon: 'HOLIHAI',
  },
  {
    id: 'raksha-bandhan',
    name: 'Raksha Bandhan',
    nameHindi: 'रक्षाबंधन',
    category: 'Major Festival',
    emoji: '🧵',
    colorTheme: 'rose',
    datesByYear: {
      2025: '2025-08-09',
      2026: '2026-08-28',
      2027: '2027-08-17',
      2028: '2028-08-06',
      2029: '2029-08-25',
    },
    description: 'Sacred sister-brother festival. Brothers buy ethnic gifts for sisters and sisters buy festive wear for family ceremonies.',
    ethnicRelevance: 'Massive surge for gift sets, pastel Chikankari kurtas, and vibrant festive sets.',
    shoppingImpact: 'Critical Peak',
    recommendedActions: [
      'Launch "Rakhi Gift Store" filter on Catalogue',
      'Promote custom gift box with personalized greeting card',
      'Alert customers 10 days ahead to order before courier cutoff dates',
    ],
    suggestedAnnouncement: '🧵 RAKHI SPECIAL: GIFT HER HANDCRAFTED ETHNIC ELEGANCE | ORDER NOW FOR ON-TIME RAKHI DELIVERY',
    suggestedCoupon: 'RAKHI10',
  },
  {
    id: 'janmashtami',
    name: 'Krishna Janmashtami',
    nameHindi: 'कृष्ण जन्माष्टमी',
    category: 'Religious',
    emoji: '🪈',
    colorTheme: 'blue',
    datesByYear: {
      2025: '2025-08-16',
      2026: '2026-09-04',
      2027: '2027-08-25',
      2028: '2028-09-13',
      2029: '2029-09-01',
    },
    description: 'Birth celebration of Lord Krishna. Celebrated with pujas, Dahi Handi, and festive yellow and traditional garments.',
    ethnicRelevance: 'Yellow (Peetambar), peacock blue, and vibrant cotton kurtas are heavily sought after.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Curate Yellow & Royal Blue festive ethnic showcase',
      'Offer express delivery guarantees to metro cities',
    ],
    suggestedAnnouncement: '🪈 JANMASHTAMI UTSAV: BRIGHTEN YOUR CELEBRATIONS WITH TRADITIONAL YELLOW & BLUE EDITS',
    suggestedCoupon: 'KANHA10',
  },
  {
    id: 'ganesh-chaturthi',
    name: 'Ganesh Chaturthi',
    nameHindi: 'गणेश चतुर्थी',
    category: 'Major Festival',
    emoji: '🐘',
    colorTheme: 'orange',
    datesByYear: {
      2025: '2025-08-27',
      2026: '2026-09-14',
      2027: '2027-09-04',
      2028: '2028-08-24',
      2029: '2029-09-12',
    },
    description: '10-day grand festival of Lord Ganesha, especially celebrated in Maharashtra, Gujarat, and South India.',
    ethnicRelevance: 'Traditional saffron, marigold yellow, and festive red kurtis for sthapana and aarti.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Curate traditional festive styles for family pujas and visits',
      'Promote western and southern India regional shipping timelines',
    ],
    suggestedAnnouncement: '🐘 GANESHOTSAV SPECIAL: WELCOME BAPPA IN HANDCRAFTED ETHNIC ATTIRE | FLAT 10% OFF',
    suggestedCoupon: 'BAPPA10',
  },
  {
    id: 'republic-day',
    name: 'Republic Day (26 January)',
    nameHindi: 'गणतंत्र दिवस',
    category: 'National Event',
    emoji: '🇮🇳',
    colorTheme: 'orange',
    datesByYear: {
      2025: '2025-01-26',
      2026: '2026-01-26',
      2027: '2027-01-26',
      2028: '2028-01-26',
      2029: '2029-01-26',
    },
    description: 'National holiday marking the Indian Constitution. One of the biggest annual E-Commerce Republic Day Sale weekends.',
    ethnicRelevance: 'Tricolor theme (Saffron, White, Green), Khadi texture cotton kurtas, school/college function wear.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Launch "Great Republic Day Sale" banner with sitewide discount',
      'Feature Saffron, White, and Green Chikankari kurtis',
      'Prepare warehouse staff for post-sale dispatch spikes',
    ],
    suggestedAnnouncement: '🇮🇳 REPUBLIC DAY SALE: UP TO 26% OFF ON HANDCRAFTED ETHNIC PRINTS | FREE SHIPPING',
    suggestedCoupon: 'REPUBLIC26',
  },
  {
    id: 'independence-day',
    name: 'Independence Day (15 August)',
    nameHindi: 'स्वतंत्रता दिवस',
    category: 'National Event',
    emoji: '🇮🇳',
    colorTheme: 'emerald',
    datesByYear: {
      2025: '2025-08-15',
      2026: '2026-08-15',
      2027: '2027-08-15',
      2028: '2028-08-15',
      2029: '2029-08-15',
    },
    description: 'India\'s Independence celebration. High consumer expectation of Freedom Sales and Indian artisanal handlooms.',
    ethnicRelevance: 'Vocal for Local / Indian Handcraft pride. 100% Pure Indian Cotton & Handcrafted Chikankari.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Run "Freedom to Celebrate" ethnic discount campaign',
      'Celebrate Indian artisanal heritage & Meerut craft',
      'Stock up on Tiranga color-coded collections',
    ],
    suggestedAnnouncement: '🇮🇳 FREEDOM SALE: CELEBRATE AUTHENTIC INDIAN CRAFT | EXTRA 15% OFF WITH CODE: FREEDOM15',
    suggestedCoupon: 'FREEDOM15',
  },
  {
    id: 'makar-sankranti',
    name: 'Makar Sankranti / Pongal / Lohri',
    nameHindi: 'मकर संक्रांति / पोंगल / लोहड़ी',
    category: 'Major Festival',
    emoji: '🪁',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-01-14',
      2026: '2026-01-14',
      2027: '2027-01-14',
      2028: '2028-01-14',
      2029: '2029-01-14',
    },
    description: 'Harvest festival celebrated across all of India with flying kites, bonfire ceremonies, and vibrant traditional wear.',
    ethnicRelevance: 'Black cotton kurtas in Maharashtra, bright Punjabi festive sets in Punjab, silk-cotton styles in South.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Promote winter-to-spring ethnic transition styles',
      'Curate bright yellows and blacks for Makar Sankranti festivities',
    ],
    suggestedAnnouncement: '🪁 SANKRANTI & LOHRI UTSAV: FLY HIGH WITH TRENDY ETHNIC PRINTS | FLAT 10% OFF',
    suggestedCoupon: 'SANKRANTI10',
  },
  {
    id: 'maha-shivratri',
    name: 'Maha Shivratri',
    nameHindi: 'महाशिवरात्रि',
    category: 'Religious',
    emoji: '🔱',
    colorTheme: 'blue',
    datesByYear: {
      2025: '2025-02-26',
      2026: '2026-02-15',
      2027: '2027-03-06',
      2028: '2028-02-24',
      2029: '2029-02-12',
    },
    description: 'Revered spiritual night celebrating Lord Shiva. Devotees perform pujas wearing traditional white, saffron, and cotton outfits.',
    ethnicRelevance: 'Subtle, elegant white and saffron pure cotton Chikankari kurtas.',
    shoppingImpact: 'Moderate',
    recommendedActions: [
      'Highlight pure breathable white and natural dyed cotton ethnic kurtas',
    ],
    suggestedAnnouncement: '🔱 SHIVRATRI SPECIAL: PURE COTTON ETHNIC ATTIRE FOR POOJA & DEVOTION',
    suggestedCoupon: 'SHIVAY10',
  },
  {
    id: 'chhath-puja',
    name: 'Chhath Puja',
    nameHindi: 'छठ पूजा',
    category: 'Major Festival',
    emoji: '🌅',
    colorTheme: 'orange',
    datesByYear: {
      2025: '2025-10-28',
      2026: '2026-11-15',
      2027: '2027-11-05',
      2028: '2028-10-24',
      2029: '2029-11-11',
    },
    description: 'Ancient Vedic festival dedicated to Surya Dev and Chhathi Maiya, with huge cultural importance across Bihar, UP, Jharkhand, and NCR.',
    ethnicRelevance: 'Traditional yellow, saffron, red, and pure cotton festive suits and Anarkalis.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Prioritize dispatches to UP, Bihar, Delhi-NCR, and Mumbai hubs',
      'Highlight pure cotton and holy festive colors on homepage',
    ],
    suggestedAnnouncement: '🌅 CHHATH UTSAV SPECIAL: AUTHENTIC COTTON & FESTIVE KURTIS | SPEEDY DELIVERY TO UP & BIHAR',
    suggestedCoupon: 'CHHATH10',
  },
  {
    id: 'teej',
    name: 'Hariyali & Hartalika Teej',
    nameHindi: 'हरियाली व हरतालिका तीज',
    category: 'Major Festival',
    emoji: '🌿',
    colorTheme: 'emerald',
    datesByYear: {
      2025: '2025-07-27',
      2026: '2026-08-15',
      2027: '2027-08-05',
      2028: '2028-07-25',
      2029: '2029-08-13',
    },
    description: 'Monsoon festival celebrated by women across North India with swings, traditional dances, and green apparel.',
    ethnicRelevance: 'Extraordinary spike in Green, Emerald, Mint, and Parrot Green ethnic suits and Chikankari kurtis.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Showcase "The Green Teej Edit" banner on storefront',
      'Stock green variations across all top-selling kurti designs',
    ],
    suggestedAnnouncement: '🌿 HARIYALI TEEJ SPECIAL: THE GREEN ETHNIC COLLECTION IS LIVE | EXTRA 10% OFF',
    suggestedCoupon: 'TEEJ10',
  },
  {
    id: 'akshaya-tritiya',
    name: 'Akshaya Tritiya',
    nameHindi: 'अक्षय तृतीया',
    category: 'Religious',
    emoji: '✨',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-04-30',
      2026: '2026-04-19',
      2027: '2027-05-09',
      2028: '2028-04-27',
      2029: '2029-04-16',
    },
    description: 'Day of everlasting prosperity and new beginnings. Considered one of the most auspicious shopping days in India.',
    ethnicRelevance: 'High demand for premium handcrafted festive wear, gold embroidery, and luxury sets.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Offer special Akshaya Tritiya luxury discount voucher',
      'Promote premium Mulberry silk and heavy Chikankari kurtis',
    ],
    suggestedAnnouncement: '✨ SHUBH AKSHAYA TRITIYA: BRING HOME ETERNAL ELEGANCE | CODE: AKSHAYA10',
    suggestedCoupon: 'AKSHAYA10',
  },
  {
    id: 'baisakhi',
    name: 'Baisakhi (Vaisakhi)',
    nameHindi: 'बैसाखी',
    category: 'Major Festival',
    emoji: '🌾',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-04-14',
      2026: '2026-04-14',
      2027: '2027-04-14',
      2028: '2028-04-14',
      2029: '2029-04-14',
    },
    description: 'Spring harvest festival and Sikh New Year. Known for vibrant Punjab fairs, bhangra, and lively colors.',
    ethnicRelevance: 'Vibrant yellow, orange, and magenta Patiala style and straight Chikankari kurtas.',
    shoppingImpact: 'Moderate',
    recommendedActions: [
      'Showcase lively spring colors and Punjabi festive collection',
    ],
    suggestedAnnouncement: '🌾 BAISAKHI DIAN LAKH LAKH VADHAIYAN: CELEBRATE WITH BRIGHT FESTIVE ETHNICS',
    suggestedCoupon: 'BAISAKHI10',
  },
  {
    id: 'onam',
    name: 'Onam (Thiruvonam)',
    nameHindi: 'ओणम',
    category: 'Major Festival',
    emoji: '🌺',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-09-05',
      2026: '2026-08-26',
      2027: '2027-09-13',
      2028: '2028-09-02',
      2029: '2029-08-23',
    },
    description: 'Kerala\'s premier harvest and cultural festival with grand feasts (Onasadya) and Kasavu traditional attire.',
    ethnicRelevance: 'Off-white and gold border kurtas and cream-toned Chikankari outfits.',
    shoppingImpact: 'Moderate',
    recommendedActions: [
      'Curate cream and gold kasavu-inspired Chikankari kurtas',
    ],
    suggestedAnnouncement: '🌺 HAPPY ONAM: ETHNIC ELEGANCE IN CREAM & GOLD TONES | SPECIAL FESTIVE OFFERS',
    suggestedCoupon: 'ONAM10',
  },
  {
    id: 'christmas-newyear',
    name: 'Christmas & Year-End Celebrations',
    nameHindi: 'क्रिसमस व नववर्ष',
    category: 'Shopping Season',
    emoji: '🎄',
    colorTheme: 'red',
    datesByYear: {
      2025: '2025-12-25',
      2026: '2026-12-25',
      2027: '2027-12-25',
      2028: '2028-12-25',
      2029: '2029-12-25',
    },
    description: 'Global holiday and end-of-year shopping peak. Winter ethnic collections, velour, and festive party kurtis.',
    ethnicRelevance: 'Deep emerald greens, ruby reds, winter warm cottons, and partywear ethnic fusion.',
    shoppingImpact: 'High Rush',
    recommendedActions: [
      'Launch Year-End Clearance & Christmas Joy festive sales',
      'Offer holiday gift cards & express delivery options',
    ],
    suggestedAnnouncement: '🎄 CHRISTMAS & YEAR-END GALA: FLAT 20% OFF ON WINTER ETHNIC COLLECTION | CODE: XMAS20',
    suggestedCoupon: 'XMAS20',
  },
  {
    id: 'gandhi-jayanti',
    name: 'Gandhi Jayanti (2 October)',
    nameHindi: 'गांधी जयंती',
    category: 'National Event',
    emoji: '🕊️',
    colorTheme: 'blue',
    datesByYear: {
      2025: '2025-10-02',
      2026: '2026-10-02',
      2027: '2027-10-02',
      2028: '2028-10-02',
      2029: '2029-10-02',
    },
    description: 'National holiday honoring Mahatma Gandhi. Heavy focus on handloom, Khadi, pure cotton, and sustainable fashion.',
    ethnicRelevance: 'Pure Mulmul Cotton, organic dyes, hand-embroidered artisanal Chikankari.',
    shoppingImpact: 'Moderate',
    recommendedActions: [
      'Promote pure handcrafted cotton and artisanal heritage stories',
    ],
    suggestedAnnouncement: '🕊️ GANDHI JAYANTI: CELEBRATING PURE HANDLOOM COTTON & INDIAN ARTISANS | SPECIAL DISCOUNT',
    suggestedCoupon: 'HANDLOOM10',
  },
  {
    id: 'guru-nanak-jayanti',
    name: 'Guru Nanak Jayanti (Gurpurab)',
    nameHindi: 'गुरु नानक जयंती / गुरुपर्व',
    category: 'Religious',
    emoji: '🕯️',
    colorTheme: 'amber',
    datesByYear: {
      2025: '2025-11-05',
      2026: '2026-11-24',
      2027: '2027-11-14',
      2028: '2028-11-02',
      2029: '2029-11-21',
    },
    description: 'Most revered festival in Sikhism with Nagar Kirtan processions, langar, and sacred gatherings.',
    ethnicRelevance: 'Graceful white, blue, and saffron traditional suits and kurtis.',
    shoppingImpact: 'Moderate',
    recommendedActions: [
      'Curate dignified traditional white and pastel festive sets',
    ],
    suggestedAnnouncement: '🕯️ GURPURAB SPECIAL: GRACEFUL TRADITIONAL ETHNICS FOR SACRED OCCASIONS | FREE SHIPPING',
    suggestedCoupon: 'GURPURAB',
  },
  {
    id: 'milad-un-nabi',
    name: 'Eid-e-Milad (Milad-un-Nabi)',
    nameHindi: 'ईद-ए-मिलाद-उन-नबी',
    category: 'Religious',
    emoji: '🕌',
    colorTheme: 'emerald',
    datesByYear: {
      2025: '2025-09-05',
      2026: '2026-08-25',
      2027: '2027-08-14',
      2028: '2028-08-03',
      2029: '2029-07-23',
    },
    description: 'Observance of the birthday of Prophet Muhammad, observed with prayers, hymns, and pious gatherings.',
    ethnicRelevance: 'Modest, graceful pure cotton and Chikankari kurtas in white, cream, and soft pastels.',
    shoppingImpact: 'Moderate',
    recommendedActions: [
      'Highlight modest wear and pure hand-embroidered collection',
    ],
    suggestedAnnouncement: '🕌 MILAD SPECIAL: ELEGANT & MODEST HANDCRAFTED CHIKANKARI KURTIS',
    suggestedCoupon: 'MILAD10',
  },
];

const CUSTOM_FESTIVALS_STORAGE_KEY = 'redmode_custom_indian_festivals';

/**
 * Load any custom festivals saved by the admin in localStorage
 */
export function getCustomFestivals(): IndianFestival[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FESTIVALS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a custom festival to localStorage
 */
export function saveCustomFestival(festival: IndianFestival): void {
  try {
    const current = getCustomFestivals();
    const updated = [festival, ...current.filter((f) => f.id !== festival.id)];
    localStorage.setItem(CUSTOM_FESTIVALS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom festival', e);
  }
}

/**
 * Remove a custom festival
 */
export function deleteCustomFestival(id: string): void {
  try {
    const current = getCustomFestivals();
    const updated = current.filter((f) => f.id !== id);
    localStorage.setItem(CUSTOM_FESTIVALS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom festival', e);
  }
}

/**
 * Helper to calculate difference in calendar days between two dates (ignoring time)
 */
function getCalendarDaysDiff(targetDateStr: string, baseDate: Date): number {
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day, 0, 0, 0, 0);
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine the target date for a festival relative to baseDate.
 * If this year's date has already passed, check next year's date.
 */
export function getNextFestivalTargetDate(festival: IndianFestival, baseDate: Date = new Date()): { targetDate: string; daysRemaining: number } {
  const currentYear = baseDate.getFullYear();
  const nextYear = currentYear + 1;

  // Check current year date
  const dateThisYear = festival.datesByYear[currentYear];
  if (dateThisYear) {
    const diff = getCalendarDaysDiff(dateThisYear, baseDate);
    // If today or upcoming, use this year's date
    if (diff >= 0) {
      return { targetDate: dateThisYear, daysRemaining: diff };
    }
  }

  // If already passed this year, check next year
  const dateNextYear = festival.datesByYear[nextYear];
  if (dateNextYear) {
    const diffNext = getCalendarDaysDiff(dateNextYear, baseDate);
    return { targetDate: dateNextYear, daysRemaining: diffNext };
  }

  // Fallback if neither is explicitly defined: try finding any future date
  for (const year of [currentYear + 2, currentYear + 3]) {
    if (festival.datesByYear[year]) {
      const diff = getCalendarDaysDiff(festival.datesByYear[year], baseDate);
      if (diff >= 0) {
        return { targetDate: festival.datesByYear[year], daysRemaining: diff };
      }
    }
  }

  // Ultimate fallback: if this year exists, return it
  if (dateThisYear) {
    return { targetDate: dateThisYear, daysRemaining: getCalendarDaysDiff(dateThisYear, baseDate) };
  }

  // If completely missing, synthesize from available years or current date
  const anyDate = Object.values(festival.datesByYear)[0] || `${currentYear}-12-31`;
  return { targetDate: anyDate, daysRemaining: getCalendarDaysDiff(anyDate, baseDate) };
}

/**
 * Compute urgency level based on days remaining
 */
export function getFestivalUrgency(daysRemaining: number): FestivalUrgency {
  if (daysRemaining <= 2) return 'critical';
  if (daysRemaining <= 5) return 'high';
  if (daysRemaining <= 10) return 'medium';
  return 'info';
}

/**
 * Format status text nicely in Hinglish / English
 */
export function getFestivalStatusText(daysRemaining: number): string {
  if (daysRemaining === 0) return 'TODAY! Aaj hi hai! 🎉';
  if (daysRemaining === 1) return 'TOMORROW! Kal hai (1 Day Left) ⏳';
  if (daysRemaining <= 10) return `${daysRemaining} Days Left (Alert Active 🚨)`;
  return `In ${daysRemaining} Days`;
}

/**
 * Calculate all festival alerts for the admin panel.
 * @param baseDate The current reference date (defaults to new Date())
 * @param alertWindowDays Default is 10 days as per user requirement
 */
export function computeAllFestivalAlerts(
  baseDate: Date = new Date(),
  alertWindowDays: number = 10,
  includeCustom: boolean = true
): FestivalAlert[] {
  const customFestivals = includeCustom ? getCustomFestivals() : [];
  const allFestivals = [...MAJOR_INDIAN_FESTIVALS, ...customFestivals];

  const alerts: FestivalAlert[] = allFestivals.map((fest) => {
    const { targetDate, daysRemaining } = getNextFestivalTargetDate(fest, baseDate);
    const isAlertActive = daysRemaining >= 0 && daysRemaining <= alertWindowDays;
    const urgency = getFestivalUrgency(daysRemaining);
    const statusText = getFestivalStatusText(daysRemaining);

    return {
      festival: fest,
      targetDate,
      daysRemaining,
      isAlertActive,
      urgency,
      statusText,
    };
  });

  // Sort: active alerts first (ordered by closest daysRemaining), then upcoming events
  return alerts.sort((a, b) => {
    // If both are positive, order by days remaining ascending
    if (a.daysRemaining >= 0 && b.daysRemaining >= 0) {
      return a.daysRemaining - b.daysRemaining;
    }
    // Otherwise put upcoming ahead of past
    return a.daysRemaining >= 0 ? -1 : 1;
  });
}

/**
 * Get strictly active alerts (events within 10 days)
 */
export function getActive10DayFestivalAlerts(
  baseDate: Date = new Date(),
  alertWindowDays: number = 10
): FestivalAlert[] {
  const all = computeAllFestivalAlerts(baseDate, alertWindowDays);
  return all.filter((a) => a.isAlertActive);
}

/**
 * Format date string e.g. "2026-11-08" -> "08 Nov 2026 (Sunday)"
 */
export function formatFestivalDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'short',
    });
  } catch {
    return dateStr;
  }
}
