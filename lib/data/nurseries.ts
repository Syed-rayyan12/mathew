export interface Nursery {
  id: number;
  name: string;
  slug: string;
  postcode: string;
  address: string;
  rating: number;
  image: string;
  description: string;
}

export const nurseries: Nursery[] = [
  {
    id: 1,
    name: "Sunshine Nursery",
    slug: "sunshine-nursery",
    postcode: "SN1 2AB",
    address: "123 Sunshine Lane, Swindon",
    rating: 4.9,
    image: "/images/nursery-1.png",
    description: "Award-winning early learning supporting children growth with confidence.",
  },
  {
    id: 2,
    name: "Little Explorers",
    slug: "little-explorers",
    postcode: "SN2 3CD",
    address: "45 Explorer Street, Swindon",
    rating: 4.9,
    image: "/images/nursery-2.png",
    description: "A warm, nurturing nursery offering early learning and creative play.",
  },
  {
    id: 3,
    name: "Rainbow Days Nursery",
    slug: "rainbow-days-nursery",
    postcode: "SN3 4EF",
    address: "78 Rainbow Road, Swindon",
    rating: 4.8,
    image: "/images/nursery-3.png",
    description: "Safe, stimulating and family-focused childcare loved by parents.",
  },
  {
    id: 4,
    name: "Tiny Treasures",
    slug: "tiny-treasures",
    postcode: "SN4 5GH",
    address: "92 Treasure Avenue, Swindon",
    rating: 4.7,
    image: "https://images.pexels.com/photos/861331/pexels-photo-861331.jpeg?auto=compress",
    description: "Creative, fun and interactive environment helping children learn and grow.",
  },
  {
    id: 5,
    name: "Bright Beginnings",
    slug: "bright-beginnings",
    postcode: "SN5 6IJ",
    address: "56 Bright Close, Swindon",
    rating: 4.7,
    image: "https://images.pexels.com/photos/861331/pexels-photo-861331.jpeg?auto=compress",
    description: "Safe, stimulating and family-focused childcare loved by parents.",
  },
  {
    id: 6,
    name: "Happy Hearts Nursery",
    slug: "happy-hearts-nursery",
    postcode: "SN6 7KL",
    address: "34 Heart Street, Swindon",
    rating: 4.8,
    image: "https://images.pexels.com/photos/861331/pexels-photo-861331.jpeg?auto=compress",
    description: "Safe, stimulating and family-focused childcare loved by parents.",
  },
];
