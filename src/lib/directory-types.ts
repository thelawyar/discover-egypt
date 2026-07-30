export type Governorate = {
  id: string;
  name: string;
  slug: string;
};

export type City = {
  id: string;
  name: string;
  slug: string;
  governorate_id: string;
  is_new_city: boolean;
  is_active?: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type Taxonomy = {
  governorates: Governorate[];
  cities: City[];
  categories: Category[];
};

export type BusinessCardData = {
  id: string;
  /** Public handle used for the one-page mini-site URL: /<username>. */
  username: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  cover_image_url: string | null;
  products: string[];
  is_featured: boolean;
  category_name: string | null;
  city_name: string | null;
  governorate_name: string | null;
};

export type BusinessDetail = BusinessCardData & {
  logo_url: string | null;
  theme_primary: string | null;
  theme_bg: string | null;
  theme_style: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  latitude: number | null;
  longitude: number | null;
  city_slug: string | null;
  view_count: number;
  images: { id: string; url: string }[];
  hours: {
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    author_name: string | null;
    created_at: string;
  }[];
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

export const WEEK_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
