import type { RegionCode } from './regions';

/**
 * Mapping of region codes (ISO 3166-1 alpha-2) to their most common/representative currency (ISO 4217).
 */
export const REGION_TO_CURRENCY_MAP: Record<RegionCode, string> = {
  AC: 'SHP', // Ascension Island
  AD: 'EUR', // Andorra
  AE: 'AED', // United Arab Emirates
  AF: 'AFN', // Afghanistan
  AG: 'XCD', // Antigua & Barbuda
  AI: 'XCD', // Anguilla
  AL: 'ALL', // Albania
  AM: 'AMD', // Armenia
  AO: 'AOA', // Angola
  AQ: 'USD', // Antarctica
  AR: 'ARS', // Argentina
  AS: 'USD', // American Samoa
  AT: 'EUR', // Austria
  AU: 'AUD', // Australia
  AW: 'AWG', // Aruba
  AX: 'EUR', // Åland Islands
  AZ: 'AZN', // Azerbaijan
  BA: 'BAM', // Bosnia & Herzegovina
  BB: 'BBD', // Barbados
  BD: 'BDT', // Bangladesh
  BE: 'EUR', // Belgium
  BF: 'XOF', // Burkina Faso
  BG: 'BGN', // Bulgaria
  BH: 'BHD', // Bahrain
  BI: 'BIF', // Burundi
  BJ: 'XOF', // Benin
  BL: 'EUR', // St. Barthélemy
  BM: 'BMD', // Bermuda
  BN: 'BND', // Brunei
  BO: 'BOB', // Bolivia
  BQ: 'USD', // Caribbean Netherlands
  BR: 'BRL', // Brazil
  BS: 'BSD', // Bahamas
  BT: 'BTN', // Bhutan
  BV: 'NOK', // Bouvet Island
  BW: 'BWP', // Botswana
  BY: 'BYN', // Belarus
  BZ: 'BZD', // Belize
  CA: 'CAD', // Canada
  CC: 'AUD', // Cocos (Keeling) Islands
  CD: 'CDF', // Congo - Kinshasa
  CF: 'XAF', // Central African Republic
  CG: 'XAF', // Congo - Brazzaville
  CH: 'CHF', // Switzerland
  CI: 'XOF', // Côte d’Ivoire
  CK: 'NZD', // Cook Islands
  CL: 'CLP', // Chile
  CM: 'XAF', // Cameroon
  CN: 'CNY', // China
  CO: 'COP', // Colombia
  CR: 'CRC', // Costa Rica
  CU: 'CUP', // Cuba
  CV: 'CVE', // Cape Verde
  CW: 'ANG', // Curaçao
  CX: 'AUD', // Christmas Island
  CY: 'EUR', // Cyprus
  CZ: 'CZK', // Czechia
  DE: 'EUR', // Germany
  DJ: 'DJF', // Djibouti
  DK: 'DKK', // Denmark
  DM: 'XCD', // Dominica
  DO: 'DOP', // Dominican Republic
  DZ: 'DZD', // Algeria
  EC: 'USD', // Ecuador
  EE: 'EUR', // Estonia
  EG: 'EGP', // Egypt
  EH: 'MAD', // Western Sahara
  ER: 'ERN', // Eritrea
  ES: 'EUR', // Spain
  ET: 'ETB', // Ethiopia
  FI: 'EUR', // Finland
  FJ: 'FJD', // Fiji
  FK: 'FKP', // Falkland Islands
  FM: 'USD', // Micronesia
  FO: 'DKK', // Faroe Islands
  FR: 'EUR', // France
  GA: 'XAF', // Gabon
  GB: 'GBP', // United Kingdom
  GD: 'XCD', // Grenada
  GE: 'GEL', // Georgia
  GF: 'EUR', // French Guiana
  GG: 'GBP', // Guernsey
  GH: 'GHS', // Ghana
  GI: 'GIP', // Gibraltar
  GL: 'DKK', // Greenland
  GM: 'GMD', // Gambia
  GN: 'GNF', // Guinea
  GP: 'EUR', // Guadeloupe
  GQ: 'XAF', // Equatorial Guinea
  GR: 'EUR', // Greece
  GS: 'GBP', // South Georgia & South Sandwich Islands
  GT: 'GTQ', // Guatemala
  GU: 'USD', // Guam
  GW: 'XOF', // Guinea-Bissau
  GY: 'GYD', // Guyana
  HK: 'HKD', // Hong Kong SAR China
  HM: 'AUD', // Heard & McDonald Islands
  HN: 'HNL', // Honduras
  HR: 'EUR', // Croatia
  HT: 'HTG', // Haiti
  HU: 'HUF', // Hungary
  ID: 'IDR', // Indonesia
  IE: 'EUR', // Ireland
  IL: 'ILS', // Israel
  IM: 'GBP', // Isle of Man
  IN: 'INR', // India
  IO: 'USD', // British Indian Ocean Territory
  IQ: 'IQD', // Iraq
  IR: 'IRR', // Iran
  IS: 'ISK', // Iceland
  IT: 'EUR', // Italy
  JE: 'GBP', // Jersey
  JM: 'JMD', // Jamaica
  JO: 'JOD', // Jordan
  JP: 'JPY', // Japan
  KE: 'KES', // Kenya
  KG: 'KGS', // Kyrgyzstan
  KH: 'KHR', // Cambodia
  KI: 'AUD', // Kiribati
  KM: 'KMF', // Comoros
  KN: 'XCD', // St. Kitts & Nevis
  KP: 'KPW', // North Korea
  KR: 'KRW', // South Korea
  KW: 'KWD', // Kuwait
  KY: 'KYD', // Cayman Islands
  KZ: 'KZT', // Kazakhstan
  LA: 'LAK', // Laos
  LB: 'LBP', // Lebanon
  LC: 'XCD', // St. Lucia
  LI: 'CHF', // Liechtenstein
  LK: 'LKR', // Sri Lanka
  LR: 'LRD', // Liberia
  LS: 'LSL', // Lesotho
  LT: 'EUR', // Lithuania
  LU: 'EUR', // Luxembourg
  LV: 'EUR', // Latvia
  LY: 'LYD', // Libya
  MA: 'MAD', // Morocco
  MC: 'EUR', // Monaco
  MD: 'MDL', // Moldova
  ME: 'EUR', // Montenegro
  MF: 'EUR', // St. Martin
  MG: 'MGA', // Madagascar
  MH: 'USD', // Marshall Islands
  MK: 'MKD', // North Macedonia
  ML: 'XOF', // Mali
  MM: 'MMK', // Myanmar (Burma)
  MN: 'MNT', // Mongolia
  MO: 'MOP', // Macao SAR China
  MP: 'USD', // Northern Mariana Islands
  MQ: 'EUR', // Martinique
  MR: 'MRU', // Mauritania
  MS: 'XCD', // Montserrat
  MT: 'EUR', // Malta
  MU: 'MUR', // Mauritius
  MV: 'MVR', // Maldives
  MW: 'MWK', // Malawi
  MX: 'MXN', // Mexico
  MY: 'MYR', // Malaysia
  MZ: 'MZN', // Mozambique
  NA: 'NAD', // Namibia
  NC: 'XPF', // New Caledonia
  NE: 'XOF', // Niger
  NF: 'AUD', // Norfolk Island
  NG: 'NGN', // Nigeria
  NI: 'NIO', // Nicaragua
  NL: 'EUR', // Netherlands
  NO: 'NOK', // Norway
  NP: 'NPR', // Nepal
  NR: 'AUD', // Nauru
  NU: 'NZD', // Niue
  NZ: 'NZD', // New Zealand
  OM: 'OMR', // Oman
  PA: 'PAB', // Panama
  PE: 'PEN', // Peru
  PF: 'XPF', // French Polynesia
  PG: 'PGK', // Papua New Guinea
  PH: 'PHP', // Philippines
  PK: 'PKR', // Pakistan
  PL: 'PLN', // Poland
  PM: 'EUR', // St. Pierre & Miquelon
  PN: 'NZD', // Pitcairn Islands
  PR: 'USD', // Puerto Rico
  PS: 'ILS', // Palestinian Territories
  PT: 'EUR', // Portugal
  PW: 'USD', // Palau
  PY: 'PYG', // Paraguay
  QA: 'QAR', // Qatar
  RE: 'EUR', // Réunion
  RO: 'RON', // Romania
  RS: 'RSD', // Serbia
  RU: 'RUB', // Russia
  RW: 'RWF', // Rwanda
  SA: 'SAR', // Saudi Arabia
  SB: 'SBD', // Solomon Islands
  SC: 'SCR', // Seychelles
  SD: 'SDG', // Sudan
  SE: 'SEK', // Sweden
  SG: 'SGD', // Singapore
  SH: 'SHP', // St. Helena
  SI: 'EUR', // Slovenia
  SJ: 'NOK', // Svalbard & Jan Mayen
  SK: 'EUR', // Slovakia
  SL: 'SLL', // Sierra Leone
  SM: 'EUR', // San Marino
  SN: 'XOF', // Senegal
  SO: 'SOS', // Somalia
  SR: 'SRD', // Suriname
  SS: 'SSP', // South Sudan
  ST: 'STN', // São Tomé & Príncipe
  SV: 'USD', // El Salvador
  SX: 'ANG', // Sint Maarten
  SY: 'SYP', // Syria
  SZ: 'SZL', // Eswatini
  TC: 'USD', // Turks & Caicos Islands
  TD: 'XAF', // Chad
  TF: 'EUR', // French Southern Territories
  TG: 'XOF', // Togo
  TH: 'THB', // Thailand
  TJ: 'TJS', // Tajikistan
  TK: 'NZD', // Tokelau
  TL: 'USD', // Timor-Leste
  TM: 'TMT', // Turkmenistan
  TN: 'TND', // Tunisia
  TO: 'TOP', // Tonga
  TR: 'TRY', // Türkiye
  TT: 'TTD', // Trinidad & Tobago
  TV: 'AUD', // Tuvalu
  TW: 'TWD', // Taiwan
  TZ: 'TZS', // Tanzania
  UA: 'UAH', // Ukraine
  UG: 'UGX', // Uganda
  UM: 'USD', // U.S. Outlying Islands
  US: 'USD', // United States
  UY: 'UYU', // Uruguay
  UZ: 'UZS', // Uzbekistan
  VA: 'EUR', // Vatican City
  VC: 'XCD', // St. Vincent & Grenadines
  VE: 'VES', // Venezuela
  VG: 'USD', // British Virgin Islands
  VI: 'USD', // U.S. Virgin Islands
  VN: 'VND', // Vietnam
  VU: 'VUV', // Vanuatu
  WF: 'XPF', // Wallis & Futuna
  WS: 'WST', // Samoa
  YE: 'YER', // Yemen
  YT: 'EUR', // Mayotte
  ZA: 'ZAR', // South Africa
  ZM: 'ZMW', // Zambia
  ZW: 'ZWL', // Zimbabwe
  CP: 'EUR', // Clipperton Island
  CQ: 'GBP', // Sark
  CT: 'KIR', // Kiribati
  DG: 'USD', // Diego Garcia
  EA: 'EUR', // Ceuta & Melilla
  EU: 'EUR', // European Union
  EZ: 'EUR', // Eurozone
  FQ: 'NOK', // Antarctica
  IC: 'EUR', // Canary Islands
  JT: 'USD', // U.S. Outlying Islands
  MI: 'USD', // U.S. Outlying Islands
  NH: 'VUV', // Vanuatu
  NQ: 'NOK', // Antarctica
  PU: 'USD', // U.S. Outlying Islands
  TA: 'SHP', // Tristan da Cunha
  WK: 'USD', // U.S. Outlying Islands
  XK: 'EUR', // Kosovo
};

export function getDefaultCurrencyForRegion(
  regionCode: RegionCode | (string & {}),
): string | undefined {
  return REGION_TO_CURRENCY_MAP[regionCode as RegionCode] ?? undefined;
}

export const ALL_CURRENCIES = [
  'ADP',
  'AED',
  'AFA',
  'AFN',
  'ALK',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'AOK',
  'AON',
  'AOR',
  'ARA',
  'ARL',
  'ARM',
  'ARP',
  'ARS',
  'ATS',
  'AUD',
  'AWG',
  'AZM',
  'AZN',
  'BAD',
  'BAM',
  'BAN',
  'BBD',
  'BDT',
  'BEC',
  'BEF',
  'BEL',
  'BGL',
  'BGM',
  'BGN',
  'BGO',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BOL',
  'BOP',
  'BOV',
  'BRB',
  'BRC',
  'BRE',
  'BRL',
  'BRN',
  'BRR',
  'BRZ',
  'BSD',
  'BTN',
  'BUK',
  'BWP',
  'BYB',
  'BYN',
  'BYR',
  'BZD',
  'CAD',
  'CDF',
  'CHE',
  'CHF',
  'CHW',
  'CLE',
  'CLF',
  'CLP',
  'CNH',
  'CNX',
  'CNY',
  'COP',
  'COU',
  'CRC',
  'CSD',
  'CSK',
  'CUC',
  'CUP',
  'CVE',
  'CYP',
  'CZK',
  'DDM',
  'DEM',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'ECS',
  'ECV',
  'EEK',
  'EGP',
  'ERN',
  'ESA',
  'ESB',
  'ESP',
  'ETB',
  'EUR',
  'FIM',
  'FJD',
  'FKP',
  'FRF',
  'GBP',
  'GEK',
  'GEL',
  'GHC',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GNS',
  'GQE',
  'GRD',
  'GTQ',
  'GWE',
  'GWP',
  'GYD',
  'HKD',
  'HNL',
  'HRD',
  'HRK',
  'HTG',
  'HUF',
  'IDR',
  'IEP',
  'ILP',
  'ILR',
  'ILS',
  'INR',
  'IQD',
  'IRR',
  'ISJ',
  'ISK',
  'ITL',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KPW',
  'KRH',
  'KRO',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LTL',
  'LTT',
  'LUC',
  'LUF',
  'LUL',
  'LVL',
  'LVR',
  'LYD',
  'MAD',
  'MAF',
  'MCF',
  'MDC',
  'MDL',
  'MGA',
  'MGF',
  'MKD',
  'MKN',
  'MLF',
  'MMK',
  'MNT',
  'MOP',
  'MRO',
  'MRU',
  'MTL',
  'MTP',
  'MUR',
  'MVP',
  'MVR',
  'MWK',
  'MXN',
  'MXP',
  'MXV',
  'MYR',
  'MZE',
  'MZM',
  'MZN',
  'NAD',
  'NGN',
  'NIC',
  'NIO',
  'NLG',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEI',
  'PEN',
  'PES',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PLZ',
  'PTE',
  'PYG',
  'QAR',
  'RHD',
  'ROL',
  'RON',
  'RSD',
  'RUB',
  'RUR',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDD',
  'SDG',
  'SDP',
  'SEK',
  'SGD',
  'SHP',
  'SIT',
  'SKK',
  'SLE',
  'SLL',
  'SOS',
  'SRD',
  'SRG',
  'SSP',
  'STD',
  'STN',
  'SUR',
  'SVC',
  'SYP',
  'SZL',
  'THB',
  'TJR',
  'TJS',
  'TMM',
  'TMT',
  'TND',
  'TOP',
  'TPE',
  'TRL',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UAK',
  'UGS',
  'UGX',
  'USD',
  'USN',
  'USS',
  'UYI',
  'UYP',
  'UYU',
  'UYW',
  'UZS',
  'VEB',
  'VED',
  'VEF',
  'VES',
  'VND',
  'VNN',
  'VUV',
  'WST',
  'XAF',
  'XAG',
  'XAU',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XCD',
  'XCG',
  'XDR',
  'XEU',
  'XFO',
  'XFU',
  'XOF',
  'XPD',
  'XPF',
  'XPT',
  'XRE',
  'XSU',
  'XTS',
  'XUA',
  'XXX',
  'YDD',
  'YER',
  'YUD',
  'YUM',
  'YUN',
  'YUR',
  'ZAL',
  'ZAR',
  'ZMK',
  'ZMW',
  'ZRN',
  'ZRZ',
  'ZWD',
  'ZWG',
  'ZWL',
  'ZWR',
];
