// Backfill trips that are missing originRegion / originTimeZone.
// originRegion is derived from originCurrency (for currencies shared by multiple
// regions, the first region in REGION_TO_CURRENCY_MAP wins) and originTimeZone is
// derived from the resulting originRegion.
import 'dotenv/config';
import { init } from '@instantdb/admin';
import schema from '../instant.schema.ts';
import { REGION_TO_CURRENCY_MAP } from '../src/data/intl/currencies.ts';
import { REGION_TO_TIMEZONE_MAP } from '../src/data/intl/timezones.ts';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID || '';
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN || '';

// Reverse mapping: currency -> a representative region code (ISO 3166-1 alpha-2).
const CURRENCY_TO_REGION: Record<string, string> = {};
for (const [region, currency] of Object.entries(REGION_TO_CURRENCY_MAP)) {
  if (CURRENCY_TO_REGION[currency] === undefined) {
    CURRENCY_TO_REGION[currency] = region;
  }
}
// ============================================================================
// HISTORIC / WITHDRAWN / REPLACED ISO 4217 CURRENCIES
// ============================================================================

// Afghanistan
CURRENCY_TO_REGION['AFA'] = 'AF'; // Afghani (old; replaced by AFN)

// Albania
CURRENCY_TO_REGION['ALK'] = 'AL'; // Old Lek

// Andorra
CURRENCY_TO_REGION['ADP'] = 'AD'; // Andorran Peseta

// Angola
CURRENCY_TO_REGION['AOK'] = 'AO'; // Kwanza
CURRENCY_TO_REGION['AON'] = 'AO'; // New Kwanza
CURRENCY_TO_REGION['AOR'] = 'AO'; // Kwanza Reajustado

// Argentina
CURRENCY_TO_REGION['ARA'] = 'AR'; // Austral
CURRENCY_TO_REGION['ARP'] = 'AR'; // Peso Argentino
CURRENCY_TO_REGION['ARY'] = 'AR'; // Peso (historic)

// Austria
CURRENCY_TO_REGION['ATS'] = 'AT'; // Austrian Schilling

// Azerbaijan
CURRENCY_TO_REGION['AYM'] = 'AZ'; // Azerbaijan Manat (transition/historic)
CURRENCY_TO_REGION['AZM'] = 'AZ'; // Azerbaijanian Manat (old; replaced by AZN)

// Belarus
CURRENCY_TO_REGION['BYB'] = 'BY'; // Belarusian Ruble (old)
CURRENCY_TO_REGION['BYR'] = 'BY'; // Belarusian Ruble (old; replaced by BYN)

// Belgium
CURRENCY_TO_REGION['BEC'] = 'BE'; // Belgian Franc, convertible
CURRENCY_TO_REGION['BEF'] = 'BE'; // Belgian Franc
CURRENCY_TO_REGION['BEL'] = 'BE'; // Belgian Franc, financial

// Bolivia
CURRENCY_TO_REGION['BOP'] = 'BO'; // Peso Boliviano

// Bosnia and Herzegovina
CURRENCY_TO_REGION['BAD'] = 'BA'; // Bosnia and Herzegovina Dinar

// Brazil
CURRENCY_TO_REGION['BRB'] = 'BR'; // Cruzeiro
CURRENCY_TO_REGION['BRC'] = 'BR'; // Cruzado
CURRENCY_TO_REGION['BRE'] = 'BR'; // Cruzeiro
CURRENCY_TO_REGION['BRN'] = 'BR'; // New Cruzado
CURRENCY_TO_REGION['BRR'] = 'BR'; // Cruzeiro Real

// Bulgaria
CURRENCY_TO_REGION['BGJ'] = 'BG'; // Lev (historic)
CURRENCY_TO_REGION['BGK'] = 'BG'; // Lev (historic)
CURRENCY_TO_REGION['BGL'] = 'BG'; // Lev (old)
CURRENCY_TO_REGION['BGN'] = 'BG'; // Bulgarian Lev (withdrawn 2026; replaced by EUR)

// Burma / Myanmar
CURRENCY_TO_REGION['BUK'] = 'MM'; // Burma Kyat (historic)

// Croatia
CURRENCY_TO_REGION['HRD'] = 'HR'; // Croatian Dinar
CURRENCY_TO_REGION['HRK'] = 'HR'; // Croatian Kuna (replaced by EUR)

// Cuba
CURRENCY_TO_REGION['CUC'] = 'CU'; // Cuban Convertible Peso

// Cyprus
CURRENCY_TO_REGION['CYP'] = 'CY'; // Cyprus Pound

// Czechoslovakia
// CZ is used as the practical successor-region mapping.
CURRENCY_TO_REGION['CSJ'] = 'CZ'; // Czechoslovak Koruna (historic)
CURRENCY_TO_REGION['CSK'] = 'CZ'; // Czechoslovak Koruna

// East Germany / German Democratic Republic
CURRENCY_TO_REGION['DDM'] = 'DE'; // Mark der DDR

// Ecuador
CURRENCY_TO_REGION['ECS'] = 'EC'; // Sucre
CURRENCY_TO_REGION['ECV'] = 'EC'; // Unidad de Valor Constante (UVC)

// Estonia
CURRENCY_TO_REGION['EEK'] = 'EE'; // Estonian Kroon

// European Monetary Cooperation Fund
// EU is a pseudo-region rather than an ISO 3166 country.
CURRENCY_TO_REGION['XEU'] = 'EU'; // European Currency Unit (ECU)

// Finland
CURRENCY_TO_REGION['FIM'] = 'FI'; // Finnish Markka

// France
CURRENCY_TO_REGION['FRF'] = 'FR'; // French Franc

// Georgia
CURRENCY_TO_REGION['GEK'] = 'GE'; // Georgian Coupon

// Germany
CURRENCY_TO_REGION['DEM'] = 'DE'; // Deutsche Mark

// Ghana
CURRENCY_TO_REGION['GHC'] = 'GH'; // Ghanaian Cedi (old)
CURRENCY_TO_REGION['GHP'] = 'GH'; // Ghanaian Pound

// Greece
CURRENCY_TO_REGION['GRD'] = 'GR'; // Greek Drachma

// Guinea
CURRENCY_TO_REGION['GNE'] = 'GN'; // Guinean Syli / historic Guinea currency
CURRENCY_TO_REGION['GNS'] = 'GN'; // Syli

// Guinea-Bissau
CURRENCY_TO_REGION['GWE'] = 'GW'; // Guinea Escudo
CURRENCY_TO_REGION['GWP'] = 'GW'; // Guinea-Bissau Peso

// Equatorial Guinea
CURRENCY_TO_REGION['GQE'] = 'GQ'; // Ekwele

// Iceland
CURRENCY_TO_REGION['ISJ'] = 'IS'; // Old Icelandic Krona

// Ireland
CURRENCY_TO_REGION['IEP'] = 'IE'; // Irish Pound

// Israel
CURRENCY_TO_REGION['ILP'] = 'IL'; // Israeli Pound
CURRENCY_TO_REGION['ILR'] = 'IL'; // Old Israeli Shekel

// Italy
CURRENCY_TO_REGION['ITL'] = 'IT'; // Italian Lira

// Laos
CURRENCY_TO_REGION['LAJ'] = 'LA'; // Pathet Lao Kip

// Latvia
CURRENCY_TO_REGION['LVR'] = 'LV'; // Latvian Ruble
CURRENCY_TO_REGION['LVL'] = 'LV'; // Latvian Lats

// Lesotho
CURRENCY_TO_REGION['LSM'] = 'LS'; // Lesotho Loti (historic code)

// Lithuania
CURRENCY_TO_REGION['LTT'] = 'LT'; // Talonas
CURRENCY_TO_REGION['LTL'] = 'LT'; // Lithuanian Litas

// Luxembourg
CURRENCY_TO_REGION['LUC'] = 'LU'; // Luxembourg Convertible Franc
CURRENCY_TO_REGION['LUF'] = 'LU'; // Luxembourg Franc
CURRENCY_TO_REGION['LUL'] = 'LU'; // Luxembourg Financial Franc

// Madagascar
CURRENCY_TO_REGION['MGF'] = 'MG'; // Malagasy Franc

// Maldives
CURRENCY_TO_REGION['MVQ'] = 'MV'; // Maldive Rupee

// Mali
CURRENCY_TO_REGION['MLF'] = 'ML'; // Mali Franc

// Malta
CURRENCY_TO_REGION['MTP'] = 'MT'; // Maltese Pound
CURRENCY_TO_REGION['MTL'] = 'MT'; // Maltese Lira

// Mauritania
CURRENCY_TO_REGION['MRO'] = 'MR'; // Ouguiya (old; replaced by MRU)

// Mexico
CURRENCY_TO_REGION['MXP'] = 'MX'; // Mexican Peso (old)

// Mozambique
CURRENCY_TO_REGION['MZE'] = 'MZ'; // Mozambique Escudo
CURRENCY_TO_REGION['MZM'] = 'MZ'; // Mozambique Metical (old)

// Netherlands
CURRENCY_TO_REGION['NLG'] = 'NL'; // Netherlands Guilder

// Netherlands Antilles
// ANG historically covered multiple territories.
// CW is used as the practical primary successor mapping.
CURRENCY_TO_REGION['ANG'] = 'CW'; // Netherlands Antillean Guilder (withdrawn 2025)

// Nicaragua
CURRENCY_TO_REGION['NIC'] = 'NI'; // Cordoba (old)

// Peru
CURRENCY_TO_REGION['PEH'] = 'PE'; // Historic Peru currency/unit
CURRENCY_TO_REGION['PEI'] = 'PE'; // Inti
CURRENCY_TO_REGION['PES'] = 'PE'; // Sol (old)

// Poland
CURRENCY_TO_REGION['PLZ'] = 'PL'; // Polish Zloty (old)

// Portugal
CURRENCY_TO_REGION['PTE'] = 'PT'; // Portuguese Escudo

// Romania
CURRENCY_TO_REGION['ROK'] = 'RO'; // Leu (historic)
CURRENCY_TO_REGION['ROL'] = 'RO'; // Old Romanian Leu

// Russia
CURRENCY_TO_REGION['RUR'] = 'RU'; // Russian Ruble (old; replaced by RUB)

// Serbia and Montenegro
CURRENCY_TO_REGION['CSD'] = 'RS'; // Serbian Dinar (Serbia and Montenegro)

// Sierra Leone
CURRENCY_TO_REGION['SLL'] = 'SL'; // Leone (old; replaced by SLE)

// Slovakia
CURRENCY_TO_REGION['SKK'] = 'SK'; // Slovak Koruna

// Slovenia
CURRENCY_TO_REGION['SIT'] = 'SI'; // Slovenian Tolar

// South Africa
CURRENCY_TO_REGION['ZAL'] = 'ZA'; // Financial Rand

// São Tomé and Príncipe
CURRENCY_TO_REGION['STD'] = 'ST'; // Dobra (old; replaced by STN)

// Sudan
CURRENCY_TO_REGION['SDP'] = 'SD'; // Sudanese Pound (old)
CURRENCY_TO_REGION['SDD'] = 'SD'; // Sudanese Dinar

// Suriname
CURRENCY_TO_REGION['SRG'] = 'SR'; // Suriname Guilder

// Soviet Union
// RU is a practical successor mapping; SUR circulated across the USSR.
CURRENCY_TO_REGION['SUR'] = 'RU'; // Soviet Ruble

// Spain
CURRENCY_TO_REGION['ESA'] = 'ES'; // Spanish Peseta account code
CURRENCY_TO_REGION['ESB'] = 'ES'; // Convertible Peseta Account
CURRENCY_TO_REGION['ESP'] = 'ES'; // Spanish Peseta

// Tajikistan
CURRENCY_TO_REGION['TJR'] = 'TJ'; // Tajik Ruble

// Timor-Leste / East Timor
CURRENCY_TO_REGION['TPE'] = 'TL'; // Timor Escudo

// Turkey
CURRENCY_TO_REGION['TRL'] = 'TR'; // Old Turkish Lira

// Turkmenistan
CURRENCY_TO_REGION['TMM'] = 'TM'; // Turkmenistan Manat (old)

// Uganda
CURRENCY_TO_REGION['UGS'] = 'UG'; // Uganda Shilling (old)
CURRENCY_TO_REGION['UGW'] = 'UG'; // Old Uganda Shilling

// Ukraine
CURRENCY_TO_REGION['UAK'] = 'UA'; // Ukrainian Karbovanets

// Uruguay
CURRENCY_TO_REGION['UYN'] = 'UY'; // Old Uruguay Peso
CURRENCY_TO_REGION['UYP'] = 'UY'; // Uruguayan Peso (old)

// Venezuela
CURRENCY_TO_REGION['VEB'] = 'VE'; // Venezuelan Bolivar (old)
CURRENCY_TO_REGION['VEF'] = 'VE'; // Bolivar Fuerte

// Vietnam
CURRENCY_TO_REGION['VNC'] = 'VN'; // Old Dong

// Yemen
CURRENCY_TO_REGION['YDD'] = 'YE'; // Yemeni Dinar

// Yugoslavia
// RS is used as the practical successor-region mapping.
CURRENCY_TO_REGION['YUD'] = 'RS'; // New Yugoslavian Dinar
CURRENCY_TO_REGION['YUN'] = 'RS'; // Yugoslavian Dinar
CURRENCY_TO_REGION['YUM'] = 'RS'; // Yugoslavian New Dinar

// Zaire / Democratic Republic of the Congo
CURRENCY_TO_REGION['ZRZ'] = 'CD'; // Zaire
CURRENCY_TO_REGION['ZRN'] = 'CD'; // New Zaire

// Zambia
CURRENCY_TO_REGION['ZMK'] = 'ZM'; // Zambian Kwacha (old)

// Zimbabwe / Rhodesia
CURRENCY_TO_REGION['ZWC'] = 'ZW'; // Rhodesian Dollar
CURRENCY_TO_REGION['ZWD'] = 'ZW'; // Zimbabwe Dollar (old)
CURRENCY_TO_REGION['ZWN'] = 'ZW'; // Zimbabwe Dollar (new, historic)
CURRENCY_TO_REGION['ZWR'] = 'ZW'; // Zimbabwe Dollar (historic)
CURRENCY_TO_REGION['ZWL'] = 'ZW'; // Zimbabwe Dollar (withdrawn 2024)

async function main() {
  if (!INSTANT_APP_ID) {
    throw new Error('INSTANT_APP_ID is required');
  }
  if (!INSTANT_APP_ADMIN_TOKEN) {
    throw new Error('INSTANT_APP_ADMIN_TOKEN is required');
  }
  const db = init({
    appId: INSTANT_APP_ID,
    adminToken: INSTANT_APP_ADMIN_TOKEN,
    schema,
  });

  const { trip: trips } = await db.query({
    trip: {
      $: {
        fields: ['id', 'originCurrency', 'originRegion', 'originTimeZone'],
      },
    },
  });

  let updated = 0;
  let skippedNoCurrency = 0;
  let skippedNoMatch = 0;
  let skippedComplete = 0;

  for (const trip of trips || []) {
    // If the trip already has both fields, nothing to do.
    if (trip.originRegion && trip.originTimeZone) {
      skippedComplete += 1;
      continue;
    }
    // Derive region from currency (or reuse the existing one when only the time zone is missing).
    const region = trip.originRegion || CURRENCY_TO_REGION[trip.originCurrency];
    if (!region) {
      if (trip.originCurrency) {
        skippedNoMatch += 1;
        console.log(
          `No region found for currency "${trip.originCurrency}" (trip ${trip.id})`,
        );
      } else {
        skippedNoCurrency += 1;
      }
      continue;
    }
    const timeZone = REGION_TO_TIMEZONE_MAP[region];
    if (!timeZone) {
      skippedNoMatch += 1;
      console.log(`No time zone found for region "${region}" (trip ${trip.id})`);
      continue;
    }
    await db.transact([
      db.tx.trip[trip.id].merge({
        originRegion: region,
        originTimeZone: timeZone,
        lastUpdatedAt: Date.now(),
      }),
    ]);
    updated += 1;
    if (updated % 100 === 0) {
      console.log(`Updated ${updated} trips so far...`);
    }
  }

  console.log('Done.');
  console.log(`  updated:           ${updated}`);
  console.log(`  skipped (complete): ${skippedComplete}`);
  console.log(`  skipped (no curr): ${skippedNoCurrency}`);
  console.log(`  skipped (no match): ${skippedNoMatch}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
