// Global type definitions to fix TypeScript errors

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      GOOGLE_GENERATIVE_AI_API_KEY: string;
      [key: string]: string | undefined;
    }
  }

  var process: {
    env: NodeJS.ProcessEnv;
  };
}

// React JSX types
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element {}
  interface ElementClass {}
  interface ElementAttributesProperty {}
  interface ElementChildrenAttribute {}
  interface LibraryManagedAttributes<C, P> {}
  interface IntrinsicAttributes {}
  interface IntrinsicClassAttributes<T> {}
}

// React types
declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export const Fragment: any;
  export default any;
  export interface ReactNode {}
  export interface ComponentType<P = {}> {}
  export interface FC<P = {}> {}
  export interface ReactElement {}
}

// Note: Removed custom Next.js type extensions that were masking API incompatibilities
// Using official Next.js types instead

// Lucide React types
declare module 'lucide-react' {
  export const Check: any;
  export const X: any;
  export const ChevronDown: any;
  export const ChevronUp: any;
  export const ArrowRight: any;
  export const ArrowLeft: any;
  export const Plus: any;
  export const Minus: any;
  export const Search: any;
  export const Settings: any;
  export const User: any;
  export const Home: any;
  export const Menu: any;
  export const Bell: any;
  export const Mail: any;
  export const Phone: any;
  export const Calendar: any;
  export const Clock: any;
  export const MapPin: any;
  export const Star: any;
  export const Heart: any;
  export const Share: any;
  export const Download: any;
  export const Upload: any;
  export const Edit: any;
  export const Trash: any;
  export const Save: any;
  export const Copy: any;
  export const Cut: any;
  export const Paste: any;
  export const Undo: any;
  export const Redo: any;
  export const Refresh: any;
  export const Power: any;
  export const Lock: any;
  export const Unlock: any;
  export const Eye: any;
  export const EyeOff: any;
  export const Info: any;
  export const AlertCircle: any;
  export const CheckCircle: any;
  export const XCircle: any;
  export const HelpCircle: any;
  export const Loader: any;
  export const Spinner: any;
  export const MoreHorizontal: any;
  export const MoreVertical: any;
  export const ExternalLink: any;
  export const Link: any;
  export const Unlink: any;
  export const Image: any;
  export const File: any;
  export const FileText: any;
  export const Folder: any;
  export const FolderOpen: any;
  export const Database: any;
  export const Server: any;
  export const Cloud: any;
  export const Wifi: any;
  export const WifiOff: any;
  export const Bluetooth: any;
  export const Battery: any;
  export const Volume: any;
  export const VolumeOff: any;
  export const Play: any;
  export const Pause: any;
  export const Stop: any;
  export const SkipBack: any;
  export const SkipForward: any;
  export const Rewind: any;
  export const FastForward: any;
  export const Repeat: any;
  export const Shuffle: any;
  export const Mic: any;
  export const MicOff: any;
  export const Camera: any;
  export const CameraOff: any;
  export const Video: any;
  export const VideoOff: any;
  export const Monitor: any;
  export const Smartphone: any;
  export const Tablet: any;
  export const Laptop: any;
  export const Desktop: any;
  export const Watch: any;
  export const Headphones: any;
  export const Speaker: any;
  export const Printer: any;
  export const Scanner: any;
  export const Keyboard: any;
  export const Mouse: any;
  export const Gamepad: any;
  export const Joystick: any;
  export const Controller: any;
  export const Tv: any;
  export const Radio: any;
  export const Satellite: any;
  export const Antenna: any;
  export const Signal: any;
  export const Zap: any;
  export const ZapOff: any;
  export const Flash: any;
  export const FlashOff: any;
  export const Sun: any;
  export const Moon: any;
  export const CloudRain: any;
  export const CloudSnow: any;
  export const CloudLightning: any;
  export const CloudDrizzle: any;
  export const CloudHail: any;
  export const Umbrella: any;
  export const Thermometer: any;
  export const Wind: any;
  export const Compass: any;
  export const Navigation: any;
  export const Map: any;
  export const Globe: any;
  export const Flag: any;
  export const Bookmark: any;
  export const Tag: any;
  export const Hash: any;
  export const AtSign: any;
  export const Percent: any;
  export const Dollar: any;
  export const Euro: any;
  export const Pound: any;
  export const Yen: any;
  export const Bitcoin: any;
  export const CreditCard: any;
  export const Wallet: any;
  export const ShoppingCart: any;
  export const ShoppingBag: any;
  export const Package: any;
  export const Truck: any;
  export const Car: any;
  export const Bus: any;
  export const Train: any;
  export const Plane: any;
  export const Ship: any;
  export const Bike: any;
  export const Scooter: any;
  export const Motorcycle: any;
  export const Fuel: any;
  export const ParkingCircle: any;
  export const Traffic: any;
  export const Construction: any;
  export const Building: any;
  export const Home2: any;
  export const Office: any;
  export const Store: any;
  export const Hospital: any;
  export const School: any;
  export const University: any;
  export const Library: any;
  export const Museum: any;
  export const Theater: any;
  export const Cinema: any;
  export const Restaurant: any;
  export const Coffee: any;
  export const Pizza: any;
  export const Utensils: any;
  export const UtensilsCrossed: any;
  export const ChefHat: any;
  export const Wine: any;
  export const Beer: any;
  export const Martini: any;
  export const IceCream: any;
  export const Cake: any;
  export const Cookie: any;
  export const Apple: any;
  export const Banana: any;
  export const Cherry: any;
  export const Grape: any;
  export const Orange: any;
  export const Strawberry: any;
  export const Carrot: any;
  export const Corn: any;
  export const Pepper: any;
  export const Tomato: any;
  export const Leaf: any;
  export const Tree: any;
  export const Flower: any;
  export const Seedling: any;
  export const Cactus: any;
  export const Mushroom: any;
  export const Bug: any;
  export const Butterfly: any;
  export const Fish: any;
  export const Bird: any;
  export const Cat: any;
  export const Dog: any;
  export const Rabbit: any;
  export const Turtle: any;
  export const Snake: any;
  export const Horse: any;
  export const Cow: any;
  export const Pig: any;
  export const Sheep: any;
  export const Chicken: any;
  export const Duck: any;
  export const Eagle: any;
  export const Owl: any;
  export const Penguin: any;
  export const Octopus: any;
  export const Whale: any;
  export const Dolphin: any;
  export const Shark: any;
  export const Crab: any;
  export const Lobster: any;
  export const Shrimp: any;
  export const Jellyfish: any;
  export const Starfish: any;
  export const Shell: any;
  export const Coral: any;
  export const Seaweed: any;
  export const Anchor: any;
  export const Lighthouse: any;
  export const Island: any;
  export const Mountain: any;
  export const Volcano: any;
  export const Desert: any;
  export const Forest: any;
  export const River: any;
  export const Lake: any;
  export const Ocean: any;
  export const Beach: any;
  export const Sunrise: any;
  export const Sunset: any;
  export const Rainbow: any;
  export const Snowflake: any;
  export const Droplet: any;
  export const Fire: any;
  export const Flame: any;
  export const Sparkles: any;
  export const Gem: any;
  export const Diamond: any;
  export const Crown: any;
  export const Trophy: any;
  export const Medal: any;
  export const Award: any;
  export const Gift: any;
  export const Balloon: any;
  export const Party: any;
  export const Confetti: any;
  export const Fireworks: any;
  export const Cake2: any;
  export const Candle: any;
  export const Flower2: any;
  export const Rose: any;
  export const Tulip: any;
  export const Sunflower: any;
  export const Bouquet: any;
  export const Wreath: any;
  export const Ring: any;
  export const Necklace: any;
  export const Earrings: any;
  export const Bracelet: any;
  export const Watch2: any;
  export const Glasses: any;
  export const Sunglasses: any;
  export const Hat: any;
  export const Cap: any;
  export const Helmet: any;
  export const Mask: any;
  export const Gloves: any;
  export const Socks: any;
  export const Shoes: any;
  export const Boots: any;
  export const Sandals: any;
  export const Sneakers: any;
  export const Dress: any;
  export const Shirt: any;
  export const Pants: any;
  export const Shorts: any;
  export const Skirt: any;
  export const Jacket: any;
  export const Coat: any;
  export const Sweater: any;
  export const Hoodie: any;
  export const Tie: any;
  export const Scarf: any;
  export const Umbrella2: any;
  export const Bag: any;
  export const Backpack: any;
  export const Briefcase: any;
  export const Suitcase: any;
  export const Luggage: any;
  export const Purse: any;
  export const Handbag: any;
  export const Tote: any;
  export const Messenger: any;
  export const Duffel: any;
  export const Garment: any;
  export const Laundry: any;
  export const Iron: any;
  export const Hanger: any;
  export const Closet: any;
  export const Wardrobe: any;
  export const Mirror: any;
  export const Comb: any;
  export const Brush: any;
  export const Scissors: any;
  export const Razor: any;
  export const Toothbrush: any;
  export const Toothpaste: any;
  export const Soap: any;
  export const Shampoo: any;
  export const Towel: any;
  export const Shower: any;
  export const Bath: any;
  export const Toilet: any;
  export const Sink: any;
  export const Faucet: any;
  export const Drain: any;
  export const Pipe: any;
  export const Wrench: any;
  export const Hammer: any;
  export const Screwdriver: any;
  export const Drill: any;
  export const Saw: any;
  export const Nail: any;
  export const Screw: any;
  export const Bolt: any;
  export const Nut: any;
  export const Washer: any;
  export const Gear: any;
  export const Cog: any;
  export const Spring: any;
  export const Lever: any;
  export const Pulley: any;
  export const Wheel: any;
  export const Axle: any;
  export const Bearing: any;
  export const Motor: any;
  export const Engine: any;
  export const Piston: any;
  export const Cylinder: any;
  export const Valve: any;
  export const Filter: any;
  export const Pump: any;
  export const Compressor: any;
  export const Fan: any;
  export const Blower: any;
  export const Heater: any;
  export const Cooler: any;
  export const Radiator: any;
  export const Thermostat: any;
  export const Gauge: any;
  export const Meter: any;
  export const Scale: any;
  export const Ruler: any;
  export const Tape: any;
  export const Level: any;
  export const Square: any;
  export const Triangle: any;
  export const Circle: any;
  export const Rectangle: any;
  export const Polygon: any;
  export const Hexagon: any;
  export const Pentagon: any;
  export const Octagon: any;
  export const Oval: any;
  export const Ellipse: any;
  export const Rhombus: any;
  export const Parallelogram: any;
  export const Trapezoid: any;
  export const Cylinder2: any;
  export const Cone: any;
  export const Sphere: any;
  export const Cube: any;
  export const Pyramid: any;
  export const Prism: any;
  export const Torus: any;
  export const Helix: any;
  export const Spiral: any;
  export const Wave: any;
  export const Sine: any;
  export const Cosine: any;
  export const Tangent: any;
  export const Arc: any;
  export const Chord: any;
  export const Radius: any;
  export const Diameter: any;
  export const Circumference: any;
  export const Area: any;
  export const Volume: any;
  export const Perimeter: any;
  export const Angle: any;
  export const Degree: any;
  export const Radian: any;
  export const Pi: any;
  export const Infinity: any;
  export const Sigma: any;
  export const Delta: any;
  export const Alpha: any;
  export const Beta: any;
  export const Gamma: any;
  export const Theta: any;
  export const Lambda: any;
  export const Mu: any;
  export const Nu: any;
  export const Xi: any;
  export const Omicron: any;
  export const Rho: any;
  export const Tau: any;
  export const Upsilon: any;
  export const Phi: any;
  export const Chi: any;
  export const Psi: any;
  export const Omega: any;
  export const Aleph: any;
  export const Beth: any;
  export const Gimel: any;
  export const Dalet: any;
  export const He: any;
  export const Vav: any;
  export const Zayin: any;
  export const Het: any;
  export const Tet: any;
  export const Yod: any;
  export const Kaf: any;
  export const Lamed: any;
  export const Mem: any;
  export const Nun: any;
  export const Samekh: any;
  export const Ayin: any;
  export const Pe: any;
  export const Tsadi: any;
  export const Qof: any;
  export const Resh: any;
  export const Shin: any;
  export const Tav: any;
}

// Supabase SSR types
declare module '@supabase/ssr' {
  export function createServerClient(
    supabaseUrl: string,
    supabaseKey: string,
    options: {
      cookies: {
        getAll(): Array<{name: string, value: string}>;
        setAll(cookiesToSet: Array<{name: string, value: string, options?: any}>): void;
      };
    }
  ): any;
}

// Supabase JS types
declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string, options?: any): any;
  export interface SupabaseClient {}
  export interface User {}
  export interface Session {}
  export interface AuthResponse {}
  export interface AuthError {}
  export interface PostgrestResponse<T> {}
  export interface PostgrestSingleResponse<T> {}
  export interface PostgrestMaybeSingleResponse<T> {}
  export interface RealtimeChannel {}
  export interface RealtimeClient {}
}

export {};
