export type ProductMapItem = {
  sku: string;
  title: string;
  handle: string;
  image?: string;
  variantId?: string;
  category:
    | "suspension"
    | "management"
    | "tank"
    | "addon";
};

export const PRODUCT_MAP: Record<string, ProductMapItem> = {
  "76016": {
    sku: "76016",
    title: "Air Lift Performance Front Kit 76016",
    handle: "air-lift-performance-front-kit-76016",
    category: "suspension",
  },
  "76516": {
    sku: "76516",
    title: "Air Lift Performance Rear Kit 76516",
    handle: "air-lift-performance-rear-kit-76516",
    category: "suspension",
  },
  "76001": {
    sku: "76001",
    title: "Air Lift Performance Front Kit 76001",
    handle: "air-lift-performance-front-kit-76001",
    category: "suspension",
  },
  "76501": {
    sku: "76501",
    title: "Air Lift Performance Rear Kit 76501",
    handle: "air-lift-performance-rear-kit-76501",
    category: "suspension",
  },

  "27680": {
    sku: "27680",
    title: "3P Management 1/4",
    handle: "3p-management-1-4",
    category: "management",
  },
  "27685": {
    sku: "27685",
    title: "3P Management 3/8",
    handle: "3p-management-3-8",
    category: "management",
  },
  "27480": {
    sku: "27480",
    title: "ALP4 Management 1/4",
    handle: "alp4-management-1-4",
    category: "management",
  },
  "27485": {
    sku: "27485",
    title: "ALP4 Management 3/8",
    handle: "alp4-management-3-8",
    category: "management",
  },

  "27801": {
    sku: "27801",
    title: "2.5 Gallon 444C Chrome Compressor",
    handle: "2-5-gallon-444c-chrome-compressor",
    category: "tank",
  },
  "27802": {
    sku: "27802",
    title: "4 Gallon 5 Port 444C Chrome Compressor",
    handle: "4-gallon-5-port-444c-chrome-compressor",
    category: "tank",
  },
  "27803": {
    sku: "27803",
    title: "4 Gallon 7 Port 444C Chrome Compressor",
    handle: "4-gallon-7-port-444c-chrome-compressor",
    category: "tank",
  },
  "27804": {
    sku: "27804",
    title: "5 Gallon 444C Chrome Compressor",
    handle: "5-gallon-444c-chrome-compressor",
    category: "tank",
  },
  "27805": {
    sku: "27805",
    title: "2.5 Gallon 444C Black Compressor",
    handle: "2-5-gallon-444c-black-compressor",
    category: "tank",
  },
  "27806": {
    sku: "27806",
    title: "4 Gallon 5 Port 444C Black Compressor",
    handle: "4-gallon-5-port-444c-black-compressor",
    category: "tank",
  },
  "27807": {
    sku: "27807",
    title: "4 Gallon 7 Port 444C Black Compressor",
    handle: "4-gallon-7-port-444c-black-compressor",
    category: "tank",
  },
  "27808": {
    sku: "27808",
    title: "5 Gallon 444C Black Compressor",
    handle: "5-gallon-444c-black-compressor",
    category: "tank",
  },

  "27705": {
    sku: "27705",
    title: "3P/ALP4 to 3H/ALP4H Upgrade Kit",
    handle: "3p-alp4-to-3h-alp4h-upgrade-kit",
    category: "addon",
  },
  "27750": {
    sku: "27750",
    title: "Secondary 444C Chrome Compressor + Harness",
    handle: "secondary-444c-chrome-compressor-secondary-harness",
    category: "addon",
  },
  "27751": {
    sku: "27751",
    title: "Secondary 444C Black Compressor + Harness",
    handle: "secondary-444c-black-compressor-secondary-harness",
    category: "addon",
  },
  "27703": {
    sku: "27703",
    title: "Secondary Compressor Harness",
    handle: "secondary-compressor-harness",
    category: "addon",
  },
};

export function getProductsBySkus(skus: string[]) {
  return skus
    .map((sku) => PRODUCT_MAP[sku])
    .filter(Boolean);
}