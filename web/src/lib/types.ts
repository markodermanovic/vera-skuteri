export interface Taxonomy {
  name: string;
  slug: string;
  description?: string;
}

export interface ScooterImage {
  src: string;
  srcset?: string;
  alt: string;
  width: number;
  height: number;
  lqip?: string;
}

export interface ColorVariant {
  name: string;
  hex: string;
  inStock: boolean;
  sku?: string;
  images: ScooterImage[];
}

export interface MainSpecs {
  motorPower?: number;
  batteryVoltage?: number;
  batteryCapacity?: number;
  range?: number;
  topSpeed?: number;
  weight?: number;
  maxLoad?: number;
  chargeTime?: number;
  tireSize?: string;
  brakes?: string;
  ipRating?: string;
}

export interface Scooter {
  id: string;
  name: string;
  slug: string;
  brand?: Taxonomy;
  category?: Taxonomy;
  excerpt?: string;
  descriptionHtml: string;
  price?: number;
  priceOnRequest: boolean;
  featured: boolean;
  mainSpecs: MainSpecs;
  extraSpecs: { label: string; value: string }[];
  colorVariants: ColorVariant[];
  seo?: { title?: string; description?: string; ogImage?: string };
}

export interface SiteSettings {
  companyName: string;
  phone: string;
  email: string;
  address?: string;
  workingHours?: string;
  otherPhones: { label?: string; number: string }[];
  social: { label: string; url: string }[];
}
