import { Bike, Wrench, RouteIcon as Road, Truck, Package, MapPin } from "lucide-react"

export const getIndustryTheme = (industry: string) => {
  switch (industry) {
    case "motorcycle_dealer":
      return {
        primary: "orange-600",
        secondary: "slate-800",
        accent: "amber-500",
        icons: [Bike, Wrench, Road],
        intents: ["Sales Inquiry", "Service Booking", "Parts Request", "Trade-In", "Financing"],
        quickActions: ["Schedule Test Ride", "Book Service", "Parts Lookup"],
      }
    case "warehouse_distribution":
      return {
        primary: "blue-600",
        secondary: "slate-700",
        accent: "cyan-500",
        icons: [Truck, Package, MapPin],
        intents: ["Quote Request", "Order Status", "Shipping Inquiry", "Supplier Contact"],
        quickActions: ["Generate Quote", "Track Shipment", "Update Order"],
      }
    default:
      return {
        primary: "blue-600",
        secondary: "slate-700",
        accent: "blue-500",
        icons: [Package],
        intents: ["General Inquiry"],
        quickActions: ["Contact Lead"],
      }
  }
}
