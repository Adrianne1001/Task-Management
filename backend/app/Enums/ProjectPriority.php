<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum ProjectPriority: string
{
    use HasValues;

    case Low = 'Low';
    case Medium = 'Medium';
    case High = 'High';

    public function label(): string
    {
        return $this->value;
    }
}
