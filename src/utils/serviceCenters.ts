interface ServiceCenter {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  hourlyRate: number;
  specialties: string[];
}

export const SERVICE_CENTERS: ServiceCenter[] = [
  // LEVC Service Centers
  {
    name: "LEVC London Central",
    address: "8 Brewery Road, London",
    postcode: "N7 9NH",
    phone: "020 7700 0888",
    hourlyRate: 85,
    specialties: ["LEVC", "TX4", "Electric Taxi"]
  },
  {
    name: "LEVC Park Royal",
    address: "Unit 4, Premier Park Road, London",
    postcode: "NW10 7NZ",
    phone: "020 8838 3988",
    hourlyRate: 82,
    specialties: ["LEVC", "TX4", "Electric Taxi"]
  },
  // TX4 Specialists
  {
    name: "KPM Taxi Engineering",
    address: "Unit 5, Thames Road Industrial Estate, London",
    postcode: "SE28 0RJ",
    phone: "020 8311 8250",
    hourlyRate: 75,
    specialties: ["TX4", "London Taxi"]
  },
  {
    name: "London Taxi Group",
    address: "Unit 7, Waterworks Road, London",
    postcode: "E16 2AT",
    phone: "020 7474 5050",
    hourlyRate: 78,
    specialties: ["TX4", "London Taxi", "Mercedes Vito"]
  },
  // Mercedes Vito Specialists
  {
    name: "Mercedes-Benz Taxi Centre",
    address: "Western Avenue, London",
    postcode: "W3 0RZ",
    phone: "020 8749 3311",
    hourlyRate: 95,
    specialties: ["Mercedes Vito", "London Taxi"]
  },
  {
    name: "Vito Taxi Services",
    address: "Unit 2, Advent Way, London",
    postcode: "N18 3AF",
    phone: "020 8803 4411",
    hourlyRate: 88,
    specialties: ["Mercedes Vito"]
  },
  // General Taxi Services
  {
    name: "London Taxi Maintenance",
    address: "Unit 10, River Road, Barking",
    postcode: "IG11 0DS",
    phone: "020 8594 1111",
    hourlyRate: 72,
    specialties: ["TX4", "LEVC", "Mercedes Vito", "London Taxi"]
  }
];

export const searchServiceCenters = (query: string): ServiceCenter[] => {
  const searchTerm = query.toLowerCase();
  return SERVICE_CENTERS.filter(center => 
    center.name.toLowerCase().includes(searchTerm) ||
    center.address.toLowerCase().includes(searchTerm) ||
    center.postcode.toLowerCase().includes(searchTerm) ||
    center.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm))
  );
};