export type Academy = {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  distanceLabel: string;
  tags: string[];
  promoTag?: string;
  isAd?: boolean;
  lat: number;
  lng: number;
  address: string;
};

export const ACADEMIES: Academy[] = [
  {
    id: "haneum-gangnam",
    name: "한음 실용음악학원 강남점",
    imageUrl:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=200&auto=format&fit=crop",
    rating: 4.9,
    reviewCount: 124,
    distanceLabel: "강남역 도보 3분",
    tags: ["보컬입시"],
    promoTag: "2027 조기할인",
    isAd: true,
    lat: 37.4979,
    lng: 127.0276,
    address: "서울 강남구 강남대로 396 한음빌딩 3층",
  },
  {
    id: "vocal-studio",
    name: "보컬명가 스튜디오",
    imageUrl:
      "https://images.unsplash.com/photo-1516280440502-613098522616?w=200&h=150&fit=crop",
    rating: 4.7,
    reviewCount: 89,
    distanceLabel: "역삼역 도보 5분",
    tags: ["취미보컬", "원데이클래스"],
    lat: 37.5004,
    lng: 127.0365,
    address: "서울 강남구 역삼동 123-45",
  },
];

export const FEATURED_ACADEMY = ACADEMIES[0];
