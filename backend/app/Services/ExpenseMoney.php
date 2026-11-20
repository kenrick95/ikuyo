<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class ExpenseMoney
{
    // Bounds keep scaled weighted multiplication within a signed 64-bit integer.
    public const MAX_MINOR = 1_000_000_000_000;

    public static function exponent(string $currency): int
    {
        static $currencies;
        $currencies ??= json_decode(file_get_contents(base_path('../shared/currency-minor-units.json')), true, flags: JSON_THROW_ON_ERROR);
        if (! array_key_exists($currency, $currencies)) {
            self::invalid('Unsupported settlement currency.');
        }

        return $currencies[$currency];
    }

    public static function minor(string $amount, string $currency): int
    {
        return self::scaled($amount, self::exponent($currency), self::MAX_MINOR);
    }

    public static function format(int $minor, string $currency): string
    {
        $digits = self::exponent($currency);
        $base = 10 ** $digits;
        $absolute = abs($minor);

        return $currency . ' ' . ($minor < 0 ? '-' : '') . intdiv($absolute, $base) . ($digits ? '.' . str_pad((string) ($absolute % $base), $digits, '0', STR_PAD_LEFT) : '');
    }

    public static function scaled(string $value, int $digits, int $maximum): int
    {
        if (PHP_INT_SIZE < 8 || ! preg_match('/^\d+(?:\.\d+)?$/D', $value)) {
            self::invalid('Enter a valid positive amount.');
        }
        [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');
        $fraction = rtrim($fraction, '0');
        if (strlen($fraction) > $digits) {
            self::invalid('Too many decimal places.');
        }
        $integer = ltrim($whole . str_pad($fraction, $digits, '0'), '0') ?: '0';
        $limit = (string) $maximum;
        if (strlen($integer) > strlen($limit) || (strlen($integer) === strlen($limit) && strcmp($integer, $limit) > 0)) {
            self::invalid('Amount exceeds the supported range.');
        }

        return (int) $integer;
    }

    /** @param array<string, int> $weights
     * @return array<string, int>
     */
    public static function allocate(int $total, array $weights): array
    {
        ksort($weights, SORT_STRING);
        $sum = array_sum($weights);
        if ($sum <= 0) {
            self::invalid('Choose at least one positive share.');
        }
        $rows = $remainders = [];
        foreach ($weights as $id => $weight) {
            $product = $total * $weight;
            $rows[$id] = intdiv($product, $sum);
            $remainders[$id] = $product % $sum;
        }
        // Stable input order makes equal remainder ties deterministic.
        arsort($remainders, SORT_NUMERIC);
        $remaining = $total - array_sum($rows);
        foreach ($remainders as $id => $_) {
            if ($remaining-- <= 0) {
                break;
            }
            $rows[$id]++;
        }

        return $rows;
    }

    public static function invalid(string $message): never
    {
        throw ValidationException::withMessages(['ledger' => $message]);
    }
}
