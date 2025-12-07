// Hub configuration for different countries
// Combines visa requirements and useful links

const HUB_CONFIG = {
  Spain: {
    test: {
      work_type: ["remotely", "freelancer", "owner", "on-site"],
      remote_work: true,
      move_with: ["solo", "spouse", "children", "pets"],
      min_work_income: 2763,
      income_multipliers: {
        spouse: 0.38,
        children: 0.12
      },
      experience: ["degree", "experience"]
    },
    requirements: [
      {
        title: "Minimum monthly income",
        value: "€2,763+ in a company that has been registered for over a year"
      },
      {
        title: "Work type",
        value: "Remote, freelance, or business owner working for foreign employer/clients"
      },
      {
        title: "Work requirement",
        value: "You must be able to work fully remotely"
      },
      {
        title: "Experience",
        value: "Degree or 3+ years of relevant experience"
      },
      {
        title: "Other",
        value: "Valid passport (1+ year), clean criminal record, health insurance only for employees"
      }
    ],
    links: [
      {
        label: "Jurado translate",
        title: "Lingua Franca",
        url: "https://www.linguafranca.es/es/traductor-jurado-oficial-otros-idiomas"
      },
      {
        label: "Nomad insurance",
        title: "Genki",
        url: "https://genki.world/?with=migroot"
      },
      {
        label: "Accounting for freelancers",
        title: "XOLO",
        url: "https://www.xolo.io/ref/DENMIR"
      }
    ],
    guides: [
      {
        title: "Spain Digital Nomad Visa 2025 — Simple Guide 🇪🇸",
        url: "https://www.migroot.io/blog/spain-digital-nomad-visa",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676a942e899b342dacc8a743_polina-kuzovkova-e5QyR6PKT1o-unsplash.webp",
        author: "Kate P.",
        date: "Dec 20, 2024"
      },
      {
        title: "Why Americans Are Moving to Madrid",
        url: "https://www.migroot.io/blog/americans-are-moving-to-madrid",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/67e42746dd2ba1aff8a2d9ff_madrid.webp",
        author: "Kate P.",
        date: "Jan 2025"
      },
      {
        title: "Top 5 Digital Nomad Visas: your 2025 adventure map",
        url: "https://www.migroot.io/blog/top-countries-offering-digital-nomad-visas",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676a943afc3d0d0d8f13d8f3_map.webp",
        author: "Kate P.",
        date: "2025"
      }
    ]
  },

  Portugal: {
    test: {
      work_type: ["remotely", "freelancer", "owner"],
      remote_work: true,
      move_with: ["solo", "spouse", "children", "pets"],
      min_work_income: 3480,
      income_multipliers: {
        spouse: 0.5,
        children: 0.3
      },
      experience: ["degree", "experience", "neither"]
    },
    requirements: [
      {
        title: "Minimum monthly income",
        value: "€3480+ per month and a tax return from last year"
      },
      {
        title: "Work type",
        value: "Remote employee, freelancer, or business owner with foreign clients"
      },
      {
        title: "Work requirement",
        value: "1+ year contract with a company outside Portugal"
      },
      {
        title: "Savings",
        value: "At least €10,440 in savings per adult (bank statement)"
      },
      {
        title: "Other",
        value: "Valid passport (1+ year), clean criminal record, health insurance and proof of accommodation"
      }
    ],
    links: [
      {
        label: "Nomad insurance",
        title: "Genki",
        url: "https://genki.world/?with=migroot"
      },
      {
        label: "Job & salary insights",
        title: "Glassdoor",
        url: "https://www.glassdoor.com"
      },
      {
        label: "Mid-term accomodation",
        title: "Airbnb",
        url: "https://www.airbnb.com"
      },
      {
        label: "Long-term accomodation",
        title: "Idealista",
        url: "https://www.idealista.pt/"
      }
    ],
    guides: [
      {
        title: "Complete Guide to Portugal's Digital Nomad Visa 2025 🇵🇹",
        url: "https://www.migroot.io/blog/portugal-digital-nomad-visa",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/67e42746f5d1a33dbe5d4ab9_aayush-gupta-ljhCEaHYWJ8-unsplash.jpg",
        author: "Kate P.",
        date: "Dec 2024"
      },
      {
        title: "Top 5 Digital Nomad Visas: your 2025 adventure map",
        url: "https://www.migroot.io/blog/top-countries-offering-digital-nomad-visas",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      },
      {
        title: "Easiest Countries for Americans to Move Abroad",
        url: "https://www.migroot.io/blog/easiest-countries-for-americans-to-move-abroad-1",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      }
    ]
  },

  Italy: {
    test: {
      work_type: ["remotely", "freelancer", "owner"],
      remote_work: true,
      move_with: ["solo", "spouse", "children"],
      min_work_income: 2125,
      income_multipliers: {
        spouse: 0.4,
        children: 0.2
      },
      experience: ["degree", "experience"]
    },
    requirements: [
      {
        title: "Minimum monthly income",
        value: "€2,125+ per month with foreign employer or clients"
      },
      {
        title: "Work type",
        value: "Remote worker or freelancer/self‑employed working for foreign clients"
      },
      {
        title: "Work requirement",
        value: "Work must be performed remotely for non‑Italian companies"
      },
      {
        title: "Experience",
        value: "A degree or at least 3+ years of relevant experience"
      },
      {
        title: "Other",
        value: "Valid passport (3+ months), clean criminal record, proof of accommodation, and health insurance"
      }
    ],
    links: [
      {
        label: "Nomad insurance",
        title: "Genki",
        url: "https://genki.world/?with=migroot"
      },
      {
        label: "Job & salary insights",
        title: "Glassdoor",
        url: "https://www.glassdoor.com"
      },
      {
        label: "Mid-term accomodation",
        title: "Airbnb",
        url: "https://www.airbnb.com"
      }
    ],
    guides: [
      {
        title: "Complete Guide to Italy's Digital Nomad Visa 2025 🇮🇹",
        url: "https://www.migroot.io/blog/italy-digital-nomad-visa",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/677722d6677395e1549cbca8_gabriella-clare-marino-AhPCGQjGl3c-unsplash.webp",
        author: "Kate P.",
        date: "Dec 2024"
      },
      {
        title: "Top 5 Digital Nomad Visas: your 2025 adventure map",
        url: "https://www.migroot.io/blog/top-countries-offering-digital-nomad-visas",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      },
      {
        title: "Easiest Countries for Americans to Move Abroad",
        url: "https://www.migroot.io/blog/easiest-countries-for-americans-to-move-abroad-1",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      }
    ]
  },

  Brazil: {
    test: {
      work_type: ["remotely", "freelancer", "owner", "on-site"],
      remote_work: true,
      move_with: ["solo", "spouse", "children"],
      min_work_income: 1290,
      income_multipliers: {
        spouse: 0.3,
        children: 0.2
      },
      experience: ["degree", "experience", "neither"]
    },
    requirements: [
      {
        title: "Valid passport",
        value: "Must be valid for your stay and have 2 blank pages"
      },
      {
        title: "Birth certificate",
        value: "Apostilled and translated into Portuguese"
      },
      {
        title: "Proof of income",
        value: "At least $1,500/month or $18,000 in savings"
      },
      {
        title: "Health insurance",
        value: "Must cover the full duration of your stay in Brazil"
      },
      {
        title: "Criminal record",
        value: "Clean record from all countries lived in last 5 years"
      },
      {
        title: "Remote work proof",
        value: "Work contract (recommended) or signed statement confirming remote work"
      }
    ],
    links: [
      {
        label: "Nomad insurance",
        title: "Genki",
        url: "https://genki.world/?with=migroot"
      },
      {
        label: "Job & salary insights",
        title: "Glassdoor",
        url: "https://www.glassdoor.com"
      },
      {
        label: "Mid-term accomodation",
        title: "Airbnb",
        url: "https://www.airbnb.com"
      }
    ],
    guides: [
      {
        title: "Brazil Digital Nomad Visa 2025 — Step-by-Step Guide 🇧🇷",
        url: "https://www.migroot.io/blog/brazil-digital-nomad-visa",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/67f7d608f68e43531948eb92_raphael-nogueira-CErddu-JwKw-unsplash.jpg",
        author: "Kate P.",
        date: "Jan 2025"
      },
      {
        title: "Top 5 Digital Nomad Visas: your 2025 adventure map",
        url: "https://www.migroot.io/blog/top-countries-offering-digital-nomad-visas",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      },
      {
        title: "Easiest Countries for Americans to Move Abroad",
        url: "https://www.migroot.io/blog/easiest-countries-for-americans-to-move-abroad-1",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      }
    ]
  },

  Indonesia: {
    test: {
      work_type: ["remotely", "freelancer", "owner", "on-site"],
      remote_work: true,
      move_with: ["solo", "spouse", "children"],
      min_work_income: 4295,
      income_multipliers: {
        spouse: 0.3,
        children: 0.15
      },
      experience: ["degree", "experience", "neither"]
    },
    requirements: [
      {
        title: "Annual income",
        value: "Show at least $60,000/year from remote work"
      },
      {
        title: "Bank statement",
        value: "3 months of statements with $2,000 balance"
      },
      {
        title: "Valid passport",
        value: "Must be valid for at least 12 months"
      },
      {
        title: "Remote work proof",
        value: "Contract from non-Indonesian company"
      },
      {
        title: "Criminal record",
        value: "Clean record from all countries lived in last 5 years"
      },
      {
        title: "Health insurance",
        value: "Must cover your full stay in Indonesia"
      },
      {
        title: "Letter of intent",
        value: "Explain your remote work and purpose of stay"
      },
      {
        title: "Proof of accommodation",
        value: "Provide local address where you plan to stay"
      }
    ],
    links: [
      {
        label: "Nomad insurance",
        title: "Genki",
        url: "https://genki.world/?with=migroot"
      },
      {
        label: "Long-term bike rental",
        title: "Bali Bike Rental",
        url: "https://balibestmotorcycle.com"
      },
      {
        label: "Job & salary insights",
        title: "Glassdoor",
        url: "https://www.glassdoor.com"
      },
      {
        label: "Mid-term accomodation",
        title: "Airbnb",
        url: "https://www.airbnb.com"
      }
    ],
    guides: [
      {
        title: "How to Get Indonesia's Remote Worker (E33G) Visa",
        url: "https://www.migroot.io/blog/indonesia-digital-nomad-visa",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/682f1f97fb52a2de165abbd2_touann-gatouillat-vergos-IBn5KU8ACXg-unsplash.jpg",
        author: "Kate P.",
        date: "Dec 2024"
      },
      {
        title: "Top 5 Digital Nomad Visas: your 2025 adventure map",
        url: "https://www.migroot.io/blog/top-countries-offering-digital-nomad-visas",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      },
      {
        title: "Easiest Countries for Americans to Move Abroad",
        url: "https://www.migroot.io/blog/easiest-countries-for-americans-to-move-abroad-1",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      }
    ]
  },

  Thailand: {
    test: {
      work_type: ["remotely", "freelancer", "owner", "on-site"],
      remote_work: true,
      move_with: ["solo", "spouse", "children", "pets"],
      min_work_income: 0,
      income_multipliers: {
        spouse: 0,
        children: 0,
        pets: 0
      },
      experience: ["degree", "experience", "neither"]
    },
    requirements: [
      {
        title: "Income requirement",
        value: "No minimum income officially required"
      },
      {
        title: "Bank savings",
        value: "At least 500,000 THB (~$15,350) in your account"
      },
      {
        title: "Criminal record",
        value: "Clean record from all countries lived in last 5 years"
      },
      {
        title: "Health insurance",
        value: "Must cover your full stay in Thailand"
      },
      {
        title: "Valid passport",
        value: "Passport must be valid for at least 6 months"
      },
      {
        title: "Remote work proof",
        value: "Employment contract or freelance project agreement"
      }
    ],
    links: [
      {
        label: "Nomad insurance",
        title: "Genki",
        url: "https://genki.world/?with=migroot"
      },
      {
        label: "Job & salary insights",
        title: "Glassdoor",
        url: "https://www.glassdoor.com"
      },
      {
        label: "Mid-term accomodation",
        title: "Airbnb",
        url: "https://www.airbnb.com"
      }
    ],
    guides: [
      {
        title: "Complete Guide to Destination Thailand Visa (DTV) 🇹🇭",
        url: "https://www.migroot.io/blog/thailand-digital-nomad-visa",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/67791e0448a3a9f26c7a4b77_thai-2.webp",
        author: "Kate P.",
        date: "Dec 2024"
      },
      {
        title: "Top 5 Digital Nomad Visas: your 2025 adventure map",
        url: "https://www.migroot.io/blog/top-countries-offering-digital-nomad-visas",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      },
      {
        title: "Easiest Countries for Americans to Move Abroad",
        url: "https://www.migroot.io/blog/easiest-countries-for-americans-to-move-abroad-1",
        image: "https://cdn.prod.website-files.com/6315a6b13c13edcc17f6d8ca/676dbfc159a4a5799c6abcb7_molly-the-cat-jgnNiX74110-unsplash.webp",
        author: "Kate P.",
        date: "2025"
      }
    ]
  }
};
