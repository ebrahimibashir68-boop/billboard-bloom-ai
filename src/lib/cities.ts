export interface CityInfo {
  slug: string;
  city: string;
  country: string;
  /** Short editorial intro used in page copy and meta description. */
  blurb: string;
  landmarks: string[];
}

/** Key cities with billboard inventory — drives /cities landing pages. */
export const CITIES: CityInfo[] = [
  {
    slug: "new-york",
    city: "New York",
    country: "United States",
    blurb:
      "Times Square and the Manhattan digital corridor deliver the highest-footfall out-of-home audience in the Americas, bookable by the hour in Pi.",
    landmarks: ["Times Square", "Madison Square Garden", "Broadway"],
  },
  {
    slug: "london",
    city: "London",
    country: "United Kingdom",
    blurb:
      "Piccadilly Lights and premium stadium screens put your creative in front of London's commuter, tourist and matchday crowds.",
    landmarks: ["Piccadilly Circus", "Wembley Stadium", "The O2"],
  },
  {
    slug: "dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    blurb:
      "Burj Khalifa-scale media and Sheikh Zayed Road screens reach a high-spend, international audience across the Gulf.",
    landmarks: ["Burj Khalifa", "Sheikh Zayed Road", "Dubai Marina"],
  },
  {
    slug: "tokyo",
    city: "Tokyo",
    country: "Japan",
    blurb:
      "Shibuya Crossing and Shinjuku's iconic screens offer the densest urban impression volume in Asia-Pacific.",
    landmarks: ["Shibuya Crossing", "Shinjuku", "Tokyo Dome"],
  },
  {
    slug: "paris",
    city: "Paris",
    country: "France",
    blurb:
      "Central Paris transit and stadium screens combine luxury-market reach with major live sport moments.",
    landmarks: ["Champs-Élysées", "Parc des Princes", "Stade de France"],
  },
  {
    slug: "singapore",
    city: "Singapore",
    country: "Singapore",
    blurb:
      "Marina Bay and Orchard Road digital media anchor campaigns across Southeast Asia's business hub.",
    landmarks: ["Marina Bay", "Orchard Road"],
  },
  {
    slug: "los-angeles",
    city: "Los Angeles",
    country: "United States",
    blurb:
      "Sunset Strip spectaculars and arena screens reach entertainment, sport and lifestyle audiences on the West Coast.",
    landmarks: ["Sunset Strip", "Crypto.com Arena"],
  },
  {
    slug: "sydney",
    city: "Sydney",
    country: "Australia",
    blurb:
      "Harbour-city screens and stadium inventory cover Australia's largest metropolitan audience.",
    landmarks: ["Circular Quay", "Accor Stadium"],
  },
  {
    slug: "hong-kong",
    city: "Hong Kong",
    country: "Hong Kong",
    blurb:
      "Causeway Bay and harbourfront media deliver premium reach across Greater China's financial gateway.",
    landmarks: ["Causeway Bay", "Victoria Harbour"],
  },
  {
    slug: "mumbai",
    city: "Mumbai",
    country: "India",
    blurb:
      "High-volume arterial and stadium screens make Mumbai the most cost-efficient mega-city buy on the network.",
    landmarks: ["Bandra", "Wankhede Stadium"],
  },
];

export const getCity = (slug: string) => CITIES.find((c) => c.slug === slug);
