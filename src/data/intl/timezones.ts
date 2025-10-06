import type { RegionCode } from './regions';

/**
 * Mapping of region codes (ISO 3166-1 alpha-2) to their most common/representative timezone.
 * For countries with multiple timezones, we use the timezone of the capital or most populated area.
 */
export const REGION_TO_TIMEZONE_MAP: Record<RegionCode, string> = {
  // A
  AC: 'Atlantic/St_Helena', // Ascension Island
  AD: 'Europe/Andorra', // Andorra
  AE: 'Asia/Dubai', // United Arab Emirates
  AF: 'Asia/Kabul', // Afghanistan
  AG: 'America/Antigua', // Antigua & Barbuda
  AI: 'America/Anguilla', // Anguilla
  AL: 'Europe/Tirane', // Albania
  AM: 'Asia/Yerevan', // Armenia
  AO: 'Africa/Luanda', // Angola
  AQ: 'Antarctica/McMurdo', // Antarctica
  AR: 'America/Argentina/Buenos_Aires', // Argentina
  AS: 'Pacific/Pago_Pago', // American Samoa
  AT: 'Europe/Vienna', // Austria
  AU: 'Australia/Sydney', // Australia
  AW: 'America/Aruba', // Aruba
  AX: 'Europe/Helsinki', // Åland Islands
  AZ: 'Asia/Baku', // Azerbaijan

  // B
  BA: 'Europe/Sarajevo', // Bosnia & Herzegovina
  BB: 'America/Barbados', // Barbados
  BD: 'Asia/Dhaka', // Bangladesh
  BE: 'Europe/Brussels', // Belgium
  BF: 'Africa/Ouagadougou', // Burkina Faso
  BG: 'Europe/Sofia', // Bulgaria
  BH: 'Asia/Bahrain', // Bahrain
  BI: 'Africa/Bujumbura', // Burundi
  BJ: 'Africa/Porto-Novo', // Benin
  BL: 'America/St_Barthelemy', // St. Barthélemy
  BM: 'Atlantic/Bermuda', // Bermuda
  BN: 'Asia/Brunei', // Brunei
  BO: 'America/La_Paz', // Bolivia
  BQ: 'America/Kralendijk', // Caribbean Netherlands
  BR: 'America/Sao_Paulo', // Brazil
  BS: 'America/Nassau', // Bahamas
  BT: 'Asia/Thimphu', // Bhutan
  BV: 'Antarctica/Syowa', // Bouvet Island
  BW: 'Africa/Gaborone', // Botswana
  BY: 'Europe/Minsk', // Belarus
  BZ: 'America/Belize', // Belize

  // C
  CA: 'America/Toronto', // Canada
  CC: 'Indian/Cocos', // Cocos (Keeling) Islands
  CD: 'Africa/Kinshasa', // Congo - Kinshasa
  CF: 'Africa/Bangui', // Central African Republic
  CG: 'Africa/Brazzaville', // Congo - Brazzaville
  CH: 'Europe/Zurich', // Switzerland
  CI: 'Africa/Abidjan', // Côte d'Ivoire
  CK: 'Pacific/Rarotonga', // Cook Islands
  CL: 'America/Santiago', // Chile
  CM: 'Africa/Douala', // Cameroon
  CN: 'Asia/Shanghai', // China
  CO: 'America/Bogota', // Colombia
  CP: 'Pacific/Pitcairn', // Clipperton Island
  CQ: 'Europe/London', // Sark
  CR: 'America/Costa_Rica', // Costa Rica
  CT: 'Pacific/Tarawa', // Kiribati
  CU: 'America/Havana', // Cuba
  CV: 'Atlantic/Cape_Verde', // Cape Verde
  CW: 'America/Curacao', // Curaçao
  CX: 'Indian/Christmas', // Christmas Island
  CY: 'Asia/Nicosia', // Cyprus
  CZ: 'Europe/Prague', // Czechia

  // D
  DE: 'Europe/Berlin', // Germany
  DG: 'Indian/Chagos', // Diego Garcia
  DJ: 'Africa/Djibouti', // Djibouti
  DK: 'Europe/Copenhagen', // Denmark
  DM: 'America/Dominica', // Dominica
  DO: 'America/Santo_Domingo', // Dominican Republic
  DZ: 'Africa/Algiers', // Algeria

  // E
  EA: 'Africa/Ceuta', // Ceuta & Melilla
  EC: 'America/Guayaquil', // Ecuador
  EE: 'Europe/Tallinn', // Estonia
  EG: 'Africa/Cairo', // Egypt
  EH: 'Africa/El_Aaiun', // Western Sahara
  ER: 'Africa/Asmara', // Eritrea
  ES: 'Europe/Madrid', // Spain
  ET: 'Africa/Addis_Ababa', // Ethiopia
  EU: 'Europe/Brussels', // European Union
  EZ: 'Europe/Brussels', // Eurozone

  // F
  FI: 'Europe/Helsinki', // Finland
  FJ: 'Pacific/Fiji', // Fiji
  FK: 'Atlantic/Stanley', // Falkland Islands
  FM: 'Pacific/Chuuk', // Micronesia
  FO: 'Atlantic/Faroe', // Faroe Islands
  FQ: 'Antarctica/McMurdo', // Antarctica
  FR: 'Europe/Paris', // France

  // G
  GA: 'Africa/Libreville', // Gabon
  GB: 'Europe/London', // United Kingdom
  GD: 'America/Grenada', // Grenada
  GE: 'Asia/Tbilisi', // Georgia
  GF: 'America/Cayenne', // French Guiana
  GG: 'Europe/Guernsey', // Guernsey
  GH: 'Africa/Accra', // Ghana
  GI: 'Europe/Gibraltar', // Gibraltar
  GL: 'America/Godthab', // Greenland
  GM: 'Africa/Banjul', // Gambia
  GN: 'Africa/Conakry', // Guinea
  GP: 'America/Guadeloupe', // Guadeloupe
  GQ: 'Africa/Malabo', // Equatorial Guinea
  GR: 'Europe/Athens', // Greece
  GS: 'Atlantic/South_Georgia', // South Georgia & South Sandwich Islands
  GT: 'America/Guatemala', // Guatemala
  GU: 'Pacific/Guam', // Guam
  GW: 'Africa/Bissau', // Guinea-Bissau
  GY: 'America/Guyana', // Guyana

  // H
  HK: 'Asia/Hong_Kong', // Hong Kong SAR China
  HM: 'Indian/Kerguelen', // Heard & McDonald Islands
  HN: 'America/Tegucigalpa', // Honduras
  HR: 'Europe/Zagreb', // Croatia
  HT: 'America/Port-au-Prince', // Haiti
  HU: 'Europe/Budapest', // Hungary

  // I
  IC: 'Atlantic/Canary', // Canary Islands
  ID: 'Asia/Jakarta', // Indonesia
  IE: 'Europe/Dublin', // Ireland
  IL: 'Asia/Jerusalem', // Israel
  IM: 'Europe/Isle_of_Man', // Isle of Man
  IN: 'Asia/Kolkata', // India
  IO: 'Indian/Chagos', // British Indian Ocean Territory
  IQ: 'Asia/Baghdad', // Iraq
  IR: 'Asia/Tehran', // Iran
  IS: 'Atlantic/Reykjavik', // Iceland
  IT: 'Europe/Rome', // Italy

  // J
  JE: 'Europe/Jersey', // Jersey
  JM: 'America/Jamaica', // Jamaica
  JO: 'Asia/Amman', // Jordan
  JP: 'Asia/Tokyo', // Japan
  JT: 'Pacific/Wake', // U.S. Outlying Islands

  // K
  KE: 'Africa/Nairobi', // Kenya
  KG: 'Asia/Bishkek', // Kyrgyzstan
  KH: 'Asia/Phnom_Penh', // Cambodia
  KI: 'Pacific/Tarawa', // Kiribati
  KM: 'Indian/Comoro', // Comoros
  KN: 'America/St_Kitts', // St. Kitts & Nevis
  KP: 'Asia/Pyongyang', // North Korea
  KR: 'Asia/Seoul', // South Korea
  KW: 'Asia/Kuwait', // Kuwait
  KY: 'America/Cayman', // Cayman Islands
  KZ: 'Asia/Almaty', // Kazakhstan

  // L
  LA: 'Asia/Vientiane', // Laos
  LB: 'Asia/Beirut', // Lebanon
  LC: 'America/St_Lucia', // St. Lucia
  LI: 'Europe/Vaduz', // Liechtenstein
  LK: 'Asia/Colombo', // Sri Lanka
  LR: 'Africa/Monrovia', // Liberia
  LS: 'Africa/Maseru', // Lesotho
  LT: 'Europe/Vilnius', // Lithuania
  LU: 'Europe/Luxembourg', // Luxembourg
  LV: 'Europe/Riga', // Latvia
  LY: 'Africa/Tripoli', // Libya

  // M
  MA: 'Africa/Casablanca', // Morocco
  MC: 'Europe/Monaco', // Monaco
  MD: 'Europe/Chisinau', // Moldova
  ME: 'Europe/Podgorica', // Montenegro
  MF: 'America/Marigot', // St. Martin
  MG: 'Indian/Antananarivo', // Madagascar
  MH: 'Pacific/Majuro', // Marshall Islands
  MI: 'Pacific/Wake', // U.S. Outlying Islands
  MK: 'Europe/Skopje', // North Macedonia
  ML: 'Africa/Bamako', // Mali
  MM: 'Asia/Yangon', // Myanmar (Burma)
  MN: 'Asia/Ulaanbaatar', // Mongolia
  MO: 'Asia/Macau', // Macao SAR China
  MP: 'Pacific/Saipan', // Northern Mariana Islands
  MQ: 'America/Martinique', // Martinique
  MR: 'Africa/Nouakchott', // Mauritania
  MS: 'America/Montserrat', // Montserrat
  MT: 'Europe/Malta', // Malta
  MU: 'Indian/Mauritius', // Mauritius
  MV: 'Indian/Maldives', // Maldives
  MW: 'Africa/Blantyre', // Malawi
  MX: 'America/Mexico_City', // Mexico
  MY: 'Asia/Kuala_Lumpur', // Malaysia
  MZ: 'Africa/Maputo', // Mozambique

  // N
  NA: 'Africa/Windhoek', // Namibia
  NC: 'Pacific/Noumea', // New Caledonia
  NE: 'Africa/Niamey', // Niger
  NF: 'Pacific/Norfolk', // Norfolk Island
  NG: 'Africa/Lagos', // Nigeria
  NH: 'Pacific/Efate', // Vanuatu
  NI: 'America/Managua', // Nicaragua
  NL: 'Europe/Amsterdam', // Netherlands
  NO: 'Europe/Oslo', // Norway
  NP: 'Asia/Kathmandu', // Nepal
  NQ: 'Antarctica/McMurdo', // Antarctica
  NR: 'Pacific/Nauru', // Nauru
  NU: 'Pacific/Niue', // Niue
  NZ: 'Pacific/Auckland', // New Zealand

  // O
  OM: 'Asia/Muscat', // Oman

  // P
  PA: 'America/Panama', // Panama
  PE: 'America/Lima', // Peru
  PF: 'Pacific/Tahiti', // French Polynesia
  PG: 'Pacific/Port_Moresby', // Papua New Guinea
  PH: 'Asia/Manila', // Philippines
  PK: 'Asia/Karachi', // Pakistan
  PL: 'Europe/Warsaw', // Poland
  PM: 'America/Miquelon', // St. Pierre & Miquelon
  PN: 'Pacific/Pitcairn', // Pitcairn Islands
  PR: 'America/Puerto_Rico', // Puerto Rico
  PS: 'Asia/Gaza', // Palestinian Territories
  PT: 'Europe/Lisbon', // Portugal
  PU: 'Pacific/Wake', // U.S. Outlying Islands
  PW: 'Pacific/Palau', // Palau
  PY: 'America/Asuncion', // Paraguay

  // Q
  QA: 'Asia/Qatar', // Qatar

  // R
  RE: 'Indian/Reunion', // Réunion
  RO: 'Europe/Bucharest', // Romania
  RS: 'Europe/Belgrade', // Serbia
  RU: 'Europe/Moscow', // Russia
  RW: 'Africa/Kigali', // Rwanda

  // S
  SA: 'Asia/Riyadh', // Saudi Arabia
  SB: 'Pacific/Guadalcanal', // Solomon Islands
  SC: 'Indian/Mahe', // Seychelles
  SD: 'Africa/Khartoum', // Sudan
  SE: 'Europe/Stockholm', // Sweden
  SG: 'Asia/Singapore', // Singapore
  SH: 'Atlantic/St_Helena', // St. Helena
  SI: 'Europe/Ljubljana', // Slovenia
  SJ: 'Arctic/Longyearbyen', // Svalbard & Jan Mayen
  SK: 'Europe/Bratislava', // Slovakia
  SL: 'Africa/Freetown', // Sierra Leone
  SM: 'Europe/San_Marino', // San Marino
  SN: 'Africa/Dakar', // Senegal
  SO: 'Africa/Mogadishu', // Somalia
  SR: 'America/Paramaribo', // Suriname
  SS: 'Africa/Juba', // South Sudan
  ST: 'Africa/Sao_Tome', // São Tomé & Príncipe
  SV: 'America/El_Salvador', // El Salvador
  SX: 'America/Lower_Princes', // Sint Maarten
  SY: 'Asia/Damascus', // Syria
  SZ: 'Africa/Mbabane', // Eswatini

  // T
  TA: 'Atlantic/St_Helena', // Tristan da Cunha
  TC: 'America/Grand_Turk', // Turks & Caicos Islands
  TD: 'Africa/Ndjamena', // Chad
  TF: 'Indian/Kerguelen', // French Southern Territories
  TG: 'Africa/Lome', // Togo
  TH: 'Asia/Bangkok', // Thailand
  TJ: 'Asia/Dushanbe', // Tajikistan
  TK: 'Pacific/Fakaofo', // Tokelau
  TL: 'Asia/Dili', // Timor-Leste
  TM: 'Asia/Ashgabat', // Turkmenistan
  TN: 'Africa/Tunis', // Tunisia
  TO: 'Pacific/Tongatapu', // Tonga
  TR: 'Europe/Istanbul', // Türkiye
  TT: 'America/Port_of_Spain', // Trinidad & Tobago
  TV: 'Pacific/Funafuti', // Tuvalu
  TW: 'Asia/Taipei', // Taiwan
  TZ: 'Africa/Dar_es_Salaam', // Tanzania

  // U
  UA: 'Europe/Kiev', // Ukraine
  UG: 'Africa/Kampala', // Uganda
  UM: 'Pacific/Wake', // U.S. Outlying Islands
  US: 'America/New_York', // United States
  UY: 'America/Montevideo', // Uruguay
  UZ: 'Asia/Tashkent', // Uzbekistan

  // V
  VA: 'Europe/Vatican', // Vatican City
  VC: 'America/St_Vincent', // St. Vincent & Grenadines
  VE: 'America/Caracas', // Venezuela
  VG: 'America/Tortola', // British Virgin Islands
  VI: 'America/St_Thomas', // U.S. Virgin Islands
  VN: 'Asia/Ho_Chi_Minh', // Vietnam
  VU: 'Pacific/Efate', // Vanuatu

  // W
  WF: 'Pacific/Wallis', // Wallis & Futuna
  WK: 'Pacific/Wake', // U.S. Outlying Islands
  WS: 'Pacific/Apia', // Samoa

  // X
  XK: 'Europe/Belgrade', // Kosovo

  // Y
  YE: 'Asia/Aden', // Yemen
  YT: 'Indian/Mayotte', // Mayotte

  // Z
  ZA: 'Africa/Johannesburg', // South Africa
  ZM: 'Africa/Lusaka', // Zambia
  ZW: 'Africa/Harare', // Zimbabwe
};

/**
 * Get the default timezone for a given region code.
 * @param regionCode - ISO 3166-1 alpha-2 region code (e.g., 'US', 'JP', 'GB')
 * @returns The IANA timezone identifier (e.g., 'America/New_York', 'Asia/Tokyo', 'Europe/London')
 */
export function getDefaultTimezoneForRegion(
  regionCode: RegionCode | (string & {}),
): string | undefined {
  return REGION_TO_TIMEZONE_MAP[regionCode as RegionCode] ?? undefined;
}

/**
 * Get the default timezone for a region code, with a fallback if not found.
 * @param regionCode - ISO 3166-1 alpha-2 region code
 * @param fallback - Fallback timezone if region is not found (defaults to 'UTC')
 * @returns The IANA timezone identifier
 */
export function getDefaultTimezoneForRegionWithFallback(
  regionCode: RegionCode | (string & {}),
  fallback: string = 'UTC',
): string {
  return getDefaultTimezoneForRegion(regionCode) ?? fallback;
}

export const ALL_TIMEZONES = [
  'Africa/Abidjan',
  'Africa/Accra',
  'Africa/Addis_Ababa',
  'Africa/Algiers',
  'Africa/Asmara',
  'Africa/Bamako',
  'Africa/Bangui',
  'Africa/Banjul',
  'Africa/Bissau',
  'Africa/Blantyre',
  'Africa/Brazzaville',
  'Africa/Bujumbura',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Ceuta',
  'Africa/Conakry',
  'Africa/Dakar',
  'Africa/Dar_es_Salaam',
  'Africa/Djibouti',
  'Africa/Douala',
  'Africa/El_Aaiun',
  'Africa/Freetown',
  'Africa/Gaborone',
  'Africa/Harare',
  'Africa/Johannesburg',
  'Africa/Juba',
  'Africa/Kampala',
  'Africa/Khartoum',
  'Africa/Kigali',
  'Africa/Kinshasa',
  'Africa/Lagos',
  'Africa/Libreville',
  'Africa/Lome',
  'Africa/Luanda',
  'Africa/Lubumbashi',
  'Africa/Lusaka',
  'Africa/Malabo',
  'Africa/Maputo',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Mogadishu',
  'Africa/Monrovia',
  'Africa/Nairobi',
  'Africa/Ndjamena',
  'Africa/Niamey',
  'Africa/Nouakchott',
  'Africa/Ouagadougou',
  'Africa/Porto-Novo',
  'Africa/Sao_Tome',
  'Africa/Tripoli',
  'Africa/Tunis',
  'Africa/Windhoek',
  'America/Adak',
  'America/Anchorage',
  'America/Anguilla',
  'America/Antigua',
  'America/Araguaina',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Catamarca',
  'America/Argentina/Cordoba',
  'America/Argentina/Jujuy',
  'America/Argentina/La_Rioja',
  'America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos',
  'America/Argentina/Salta',
  'America/Argentina/San_Juan',
  'America/Argentina/San_Luis',
  'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia',
  'America/Aruba',
  'America/Asuncion',
  'America/Atikokan',
  'America/Bahia',
  'America/Bahia_Banderas',
  'America/Barbados',
  'America/Belem',
  'America/Belize',
  'America/Blanc-Sablon',
  'America/Boa_Vista',
  'America/Bogota',
  'America/Boise',
  'America/Cambridge_Bay',
  'America/Campo_Grande',
  'America/Cancun',
  'America/Caracas',
  'America/Cayenne',
  'America/Cayman',
  'America/Chicago',
  'America/Chihuahua',
  'America/Ciudad_Juarez',
  'America/Costa_Rica',
  'America/Coyhaique',
  'America/Creston',
  'America/Cuiaba',
  'America/Curacao',
  'America/Danmarkshavn',
  'America/Dawson',
  'America/Dawson_Creek',
  'America/Denver',
  'America/Detroit',
  'America/Dominica',
  'America/Edmonton',
  'America/Eirunepe',
  'America/El_Salvador',
  'America/Fort_Nelson',
  'America/Fortaleza',
  'America/Glace_Bay',
  'America/Goose_Bay',
  'America/Grand_Turk',
  'America/Grenada',
  'America/Guadeloupe',
  'America/Guatemala',
  'America/Guayaquil',
  'America/Guyana',
  'America/Halifax',
  'America/Havana',
  'America/Hermosillo',
  'America/Indiana/Indianapolis',
  'America/Indiana/Knox',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Tell_City',
  'America/Indiana/Vevay',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Inuvik',
  'America/Iqaluit',
  'America/Jamaica',
  'America/Juneau',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Kralendijk',
  'America/La_Paz',
  'America/Lima',
  'America/Los_Angeles',
  'America/Lower_Princes',
  'America/Maceio',
  'America/Managua',
  'America/Manaus',
  'America/Marigot',
  'America/Martinique',
  'America/Matamoros',
  'America/Mazatlan',
  'America/Menominee',
  'America/Merida',
  'America/Metlakatla',
  'America/Mexico_City',
  'America/Miquelon',
  'America/Moncton',
  'America/Monterrey',
  'America/Montevideo',
  'America/Montserrat',
  'America/Nassau',
  'America/New_York',
  'America/Nome',
  'America/Noronha',
  'America/North_Dakota/Beulah',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/Nuuk',
  'America/Ojinaga',
  'America/Panama',
  'America/Paramaribo',
  'America/Phoenix',
  'America/Port-au-Prince',
  'America/Port_of_Spain',
  'America/Porto_Velho',
  'America/Puerto_Rico',
  'America/Punta_Arenas',
  'America/Rankin_Inlet',
  'America/Recife',
  'America/Regina',
  'America/Resolute',
  'America/Rio_Branco',
  'America/Santarem',
  'America/Santiago',
  'America/Santo_Domingo',
  'America/Sao_Paulo',
  'America/Scoresbysund',
  'America/Sitka',
  'America/St_Barthelemy',
  'America/St_Johns',
  'America/St_Kitts',
  'America/St_Lucia',
  'America/St_Thomas',
  'America/St_Vincent',
  'America/Swift_Current',
  'America/Tegucigalpa',
  'America/Thule',
  'America/Tijuana',
  'America/Toronto',
  'America/Tortola',
  'America/Vancouver',
  'America/Whitehorse',
  'America/Winnipeg',
  'America/Yakutat',
  'Antarctica/Casey',
  'Antarctica/Davis',
  'Antarctica/DumontDUrville',
  'Antarctica/Macquarie',
  'Antarctica/Mawson',
  'Antarctica/McMurdo',
  'Antarctica/Palmer',
  'Antarctica/Rothera',
  'Antarctica/Syowa',
  'Antarctica/Troll',
  'Antarctica/Vostok',
  'Arctic/Longyearbyen',
  'Asia/Aden',
  'Asia/Almaty',
  'Asia/Amman',
  'Asia/Anadyr',
  'Asia/Aqtau',
  'Asia/Aqtobe',
  'Asia/Ashgabat',
  'Asia/Atyrau',
  'Asia/Baghdad',
  'Asia/Bahrain',
  'Asia/Baku',
  'Asia/Bangkok',
  'Asia/Barnaul',
  'Asia/Beirut',
  'Asia/Bishkek',
  'Asia/Brunei',
  'Asia/Chita',
  'Asia/Colombo',
  'Asia/Damascus',
  'Asia/Dhaka',
  'Asia/Dili',
  'Asia/Dubai',
  'Asia/Dushanbe',
  'Asia/Famagusta',
  'Asia/Gaza',
  'Asia/Hebron',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Hovd',
  'Asia/Irkutsk',
  'Asia/Jakarta',
  'Asia/Jayapura',
  'Asia/Jerusalem',
  'Asia/Kabul',
  'Asia/Kamchatka',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Khandyga',
  'Asia/Kolkata',
  'Asia/Krasnoyarsk',
  'Asia/Kuala_Lumpur',
  'Asia/Kuching',
  'Asia/Kuwait',
  'Asia/Macau',
  'Asia/Magadan',
  'Asia/Makassar',
  'Asia/Manila',
  'Asia/Muscat',
  'Asia/Nicosia',
  'Asia/Novokuznetsk',
  'Asia/Novosibirsk',
  'Asia/Omsk',
  'Asia/Oral',
  'Asia/Phnom_Penh',
  'Asia/Pontianak',
  'Asia/Pyongyang',
  'Asia/Qatar',
  'Asia/Qostanay',
  'Asia/Qyzylorda',
  'Asia/Riyadh',
  'Asia/Sakhalin',
  'Asia/Samarkand',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Srednekolymsk',
  'Asia/Taipei',
  'Asia/Tashkent',
  'Asia/Tbilisi',
  'Asia/Tehran',
  'Asia/Thimphu',
  'Asia/Tokyo',
  'Asia/Tomsk',
  'Asia/Ulaanbaatar',
  'Asia/Urumqi',
  'Asia/Ust-Nera',
  'Asia/Vientiane',
  'Asia/Vladivostok',
  'Asia/Yakutsk',
  'Asia/Yangon',
  'Asia/Yekaterinburg',
  'Asia/Yerevan',
  'Atlantic/Azores',
  'Atlantic/Bermuda',
  'Atlantic/Canary',
  'Atlantic/Cape_Verde',
  'Atlantic/Faroe',
  'Atlantic/Madeira',
  'Atlantic/Reykjavik',
  'Atlantic/South_Georgia',
  'Atlantic/St_Helena',
  'Atlantic/Stanley',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Broken_Hill',
  'Australia/Darwin',
  'Australia/Eucla',
  'Australia/Hobart',
  'Australia/Lindeman',
  'Australia/Lord_Howe',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Etc/GMT+1',
  'Etc/GMT+10',
  'Etc/GMT+11',
  'Etc/GMT+12',
  'Etc/GMT+2',
  'Etc/GMT+3',
  'Etc/GMT+4',
  'Etc/GMT+5',
  'Etc/GMT+6',
  'Etc/GMT+7',
  'Etc/GMT+8',
  'Etc/GMT+9',
  'Etc/GMT-1',
  'Etc/GMT-10',
  'Etc/GMT-11',
  'Etc/GMT-12',
  'Etc/GMT-13',
  'Etc/GMT-14',
  'Etc/GMT-2',
  'Etc/GMT-3',
  'Etc/GMT-4',
  'Etc/GMT-5',
  'Etc/GMT-6',
  'Etc/GMT-7',
  'Etc/GMT-8',
  'Etc/GMT-9',
  'Europe/Amsterdam',
  'Europe/Andorra',
  'Europe/Astrakhan',
  'Europe/Athens',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Busingen',
  'Europe/Chisinau',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Gibraltar',
  'Europe/Guernsey',
  'Europe/Helsinki',
  'Europe/Isle_of_Man',
  'Europe/Istanbul',
  'Europe/Jersey',
  'Europe/Kaliningrad',
  'Europe/Kirov',
  'Europe/Kyiv',
  'Europe/Lisbon',
  'Europe/Ljubljana',
  'Europe/London',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Mariehamn',
  'Europe/Minsk',
  'Europe/Monaco',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Podgorica',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Samara',
  'Europe/San_Marino',
  'Europe/Sarajevo',
  'Europe/Saratov',
  'Europe/Simferopol',
  'Europe/Skopje',
  'Europe/Sofia',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Tirane',
  'Europe/Ulyanovsk',
  'Europe/Vaduz',
  'Europe/Vatican',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Volgograd',
  'Europe/Warsaw',
  'Europe/Zagreb',
  'Europe/Zurich',
  'Indian/Antananarivo',
  'Indian/Chagos',
  'Indian/Christmas',
  'Indian/Cocos',
  'Indian/Comoro',
  'Indian/Kerguelen',
  'Indian/Mahe',
  'Indian/Maldives',
  'Indian/Mauritius',
  'Indian/Mayotte',
  'Indian/Reunion',
  'Pacific/Apia',
  'Pacific/Auckland',
  'Pacific/Bougainville',
  'Pacific/Chatham',
  'Pacific/Chuuk',
  'Pacific/Easter',
  'Pacific/Efate',
  'Pacific/Fakaofo',
  'Pacific/Fiji',
  'Pacific/Funafuti',
  'Pacific/Galapagos',
  'Pacific/Gambier',
  'Pacific/Guadalcanal',
  'Pacific/Guam',
  'Pacific/Honolulu',
  'Pacific/Kanton',
  'Pacific/Kiritimati',
  'Pacific/Kosrae',
  'Pacific/Kwajalein',
  'Pacific/Majuro',
  'Pacific/Marquesas',
  'Pacific/Midway',
  'Pacific/Nauru',
  'Pacific/Niue',
  'Pacific/Norfolk',
  'Pacific/Noumea',
  'Pacific/Pago_Pago',
  'Pacific/Palau',
  'Pacific/Pitcairn',
  'Pacific/Pohnpei',
  'Pacific/Port_Moresby',
  'Pacific/Rarotonga',
  'Pacific/Saipan',
  'Pacific/Tahiti',
  'Pacific/Tarawa',
  'Pacific/Tongatapu',
  'Pacific/Wake',
  'Pacific/Wallis',
  'UTC',
];
