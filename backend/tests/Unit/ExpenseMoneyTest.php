<?php

namespace Tests\Unit;

use App\Services\ExpenseMoney;
use Tests\TestCase;

class ExpenseMoneyTest extends TestCase
{
    public function test_shared_rounding_fixtures_match_the_client(): void
    {
        $fixtures = json_decode(file_get_contents(base_path('../shared/expense-split-fixtures.json')), true, flags: JSON_THROW_ON_ERROR);
        foreach ($fixtures as $fixture) {
            $total = ExpenseMoney::minor($fixture['amount'], $fixture['currency']);
            $weights = [];
            foreach ($fixture['shares'] as $row) {
                $weights[$row['participantId']] = match ($fixture['method']) {
                    'equal' => 1,
                    'exact' => ExpenseMoney::minor($row['value'], $fixture['currency']),
                    default => ExpenseMoney::scaled($row['value'], 4, 1_000_000),
                };
            }
            $actual = $fixture['method'] === 'exact' ? $weights : ExpenseMoney::allocate($total, $weights);
            $this->assertEquals($fixture['expected'], $actual);
            $this->assertSame($total, array_sum($actual));
        }
    }
}
