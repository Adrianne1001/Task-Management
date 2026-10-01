<?php

declare(strict_types=1);

namespace App\Enums\Concerns;

/**
 * Shared helpers for string-backed enums.
 *
 * @mixin \BackedEnum
 */
trait HasValues
{
    /**
     * All backing values, in declaration order.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Human-readable list of the allowed values, e.g. "Low, Medium, High".
     */
    public static function valuesForHumans(): string
    {
        return implode(', ', self::values());
    }
}
