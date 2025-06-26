export interface Company {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const mockCompanies: Company[] = [
  {
    id: 'c1',
    name: 'Vodovod Sarajevo',
    address: 'Jaroslava Černija 8',
    city: 'Sarajevo',
    postalCode: '71000',
    phone: '033/237-220',
    email: 'info@viksa.ba',
    website: 'https://www.viksa.ba',
    logo: 'https://www.viksa.ba/images/logo.png',
    isActive: true,
    createdAt: '2020-01-01',
    updatedAt: '2023-01-15'
  },
  {
    id: 'c2',
    name: 'Vodovod Zenica',
    address: 'Bistua Nuova 17',
    city: 'Zenica',
    postalCode: '72000',
    phone: '032/209-339',
    email: 'info@vikze.ba',
    website: 'https://www.vikze.ba',
    isActive: true,
    createdAt: '2020-01-01',
    updatedAt: '2023-02-20'
  },
  {
    id: 'c3',
    name: 'Vodovod Tuzla',
    address: 'Kulina Bana 2',
    city: 'Tuzla',
    postalCode: '75000',
    phone: '035/369-850',
    email: 'info@viktuzla.ba',
    isActive: true,
    createdAt: '2020-01-01',
    updatedAt: '2023-03-10'
  },
  {
    id: 'c4',
    name: 'Vodovod Mostar',
    address: 'Adema Buća 7',
    city: 'Mostar',
    postalCode: '88000',
    phone: '036/551-278',
    email: 'info@vikmostar.ba',
    isActive: true,
    createdAt: '2020-01-01',
    updatedAt: '2023-04-05'
  },
  {
    id: 'c5',
    name: 'Vodovod Banja Luka',
    address: 'Slavka Rodića 5',
    city: 'Banja Luka',
    postalCode: '78000',
    phone: '051/212-480',
    email: 'info@vikbl.ba',
    isActive: true,
    createdAt: '2020-01-01',
    updatedAt: '2023-05-12'
  }
];